# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/tickets/in-progress/remove-built-in-sample-applications/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/tickets/in-progress/remove-built-in-sample-applications/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/tickets/in-progress/remove-built-in-sample-applications/design-spec.md`
- Current Review Round: `3`
- Trigger: `User requested architecture review on 2026-04-21 after adding stale imported-package removal under registry/settings mismatch to the in-scope cleanup design`
- Prior Review Round Reviewed: `2`
- Latest Authoritative Round: `3`
- Current-State Evidence Basis: `requirements.md`, `investigation-notes.md`, `design-spec.md`, `autobyteus-server-ts/src/application-packages/services/application-package-registry-service.ts`, `autobyteus-server-ts/src/application-packages/stores/application-package-root-settings-store.ts`, `autobyteus-server-ts/src/application-packages/stores/application-package-registry-store.ts`, `autobyteus-server-ts/src/application-bundles/utils/bundled-application-resource-root.ts`, `autobyteus-server-ts/tests/unit/application-packages/application-package-service.test.ts`, `autobyteus-server-ts/docs/modules/applications.md`

Round rules:
- Reuse the same finding IDs across reruns for the same unresolved design-review issues.
- Create new finding IDs only for newly discovered issues.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | User requested architecture review on 2026-04-21 | N/A | 0 | Pass | No | The initial cleanup design correctly emptied the current built-in payload and removed the duplicate sample-app ownership model. |
| 2 | User requested re-review on 2026-04-21 after implementation surfaced the built-in source-root/materializer ambiguity | 0 | 0 | Pass | No | The design became explicit about the built-in materializer boundary: only the server-owned built-in payload root may feed the managed built-in root, and an empty payload is a stable steady state. |
| 3 | User requested re-review on 2026-04-21 after adding stale imported-package removal under registry/settings mismatch | 0 | 0 | Pass | Yes | The expanded design now also gives imported-package removal one authoritative reconciliation owner so stale missing-path rows remain removable even when settings and registry persistence drift apart. |

## Reviewed Design Spec

The requirements basis remains sufficient and design-ready.

The expanded design is concrete enough for implementation. It still preserves the round-2 built-in cleanup architecture, and it adds the adjacent stale imported-package removal bug in the right place: not as a UI workaround, and not as a second cleanup path inside one persistence surface, but as an authoritative reconciliation operation owned by `ApplicationPackageRegistryService`.

That is the correct boundary because the current snapshot intentionally composes rows from both package-root settings and package registry persistence, including mismatch rows. Once the UI is intentionally showing those mismatch rows, the remove action must be able to reconcile across both persistence surfaces without requiring either one to be pre-synchronized. The updated design now states that clearly:
- removal resolves the package row from the registry snapshot,
- removal attempts settings cleanup if present,
- removal attempts registry-record cleanup if present,
- missing filesystem paths do not block cleanup,
- absence in one persistence surface is not itself a hard failure, and
- the authoritative service remains responsible for cache refresh after reconciliation.

This preserves boundary clarity:
- `BuiltInApplicationPackageMaterializer` owns built-in payload materialization,
- `ApplicationPackageRootSettingsStore` remains only a persistence surface for configured roots,
- `ApplicationPackageRegistryStore` remains only a persistence surface for imported package records, and
- `ApplicationPackageRegistryService` remains the authoritative owner of package import/remove/reload orchestration and cross-surface reconciliation.

No new blocking design gaps were found.

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | None | N/A | No unresolved findings carried into round 2 or round 3 | Round-1 review report | Round 1 passed without blocking findings. |
| 2 | None | N/A | No unresolved findings carried into round 3 | Round-2 review report | Round 2 passed without blocking findings. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SP-001` | Server startup / package-registry refresh through built-in package entry and managed built-in root readiness | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `SP-002` | Built-in materialization from packaged payload root into managed built-in discovery root | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `SP-003` | Bundle discovery after built-in materialization, with authoring roots entering only through explicit non-built-in provisioning | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `SP-004` | Settings remove action for a stale imported package row through authoritative reconciliation cleanup and refreshed package list | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `application-packages` | Pass | Pass | Pass | Pass | Correctly remains the authoritative subsystem for both built-in package handling and imported-package lifecycle cleanup. |
| `BuiltInApplicationPackageMaterializer` boundary | Pass | Pass | Pass | Pass | Still correctly owns only built-in payload materialization from the server-owned payload root. |
| `ApplicationPackageRegistryService` boundary | Pass | Pass | Pass | Pass | Now correctly owns cross-surface imported-package cleanup instead of assuming synchronized settings/registry state. |
| `ApplicationPackageRootSettingsStore` + `ApplicationPackageRegistryStore` persistence surfaces | Pass | Pass | Pass | Pass | Correctly remain persistence surfaces rather than cleanup coordinators. |
| `applications/` authoring roots | Pass | Pass | Pass | Pass | Correctly stay authoring-only and unrelated to the built-in materialization path. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Built-in package registry + materializer infrastructure | Pass | Pass | Pass | Pass | Correctly reused and tightened instead of replaced. |
| Bundled source-root resolution logic | Pass | Pass | Pass | Pass | Correctly kept as a small owned concern under the built-in materializer path. |
| Imported-package remove/reconcile logic | Pass | Pass | Pass | Pass | Correctly centralized under `ApplicationPackageRegistryService` rather than split between UI, settings store, and registry store. |
| Future promotion-to-built-in policy | Pass | Pass | Pass | Pass | Correctly left as policy guidance on top of existing infrastructure. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Built-in package identity vs built-in payload contents | Pass | Pass | Pass | Pass | Pass | The design still cleanly separates infrastructure existence from current payload contents. |
| Server-owned built-in payload root vs repo-root authoring roots | Pass | Pass | Pass | Pass | Pass | The updated package still assigns one meaning to each root. |
| Imported package row vs settings/registry persistence presence | Pass | Pass | Pass | Pass | Pass | The row now represents one cleanup subject even when one persistence surface is already missing it. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Duplicate built-in Brief Studio tree | Pass | Pass | Pass | Pass | `applications/brief-studio` remains the only in-repo source of truth. |
| Duplicate built-in Socratic Math Teacher tree | Pass | Pass | Pass | Pass | `applications/socratic-math-teacher` remains the only in-repo source of truth. |
| Implicit repo-authoring-as-built-in materialization path | Pass | Pass | Pass | Pass | The design still explicitly removes this broadened source-root interpretation. |
| Stale imported package rows stranded by settings/registry mismatch | Pass | Pass | Pass | Pass | The design now explicitly removes the assumption that both persistence surfaces must already agree before cleanup can proceed. |
| Current docs implying sample apps are shipped built-ins | Pass | Pass | Pass | Pass | Documentation cleanup remains explicit in scope. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-packages/services/built-in-application-package-materializer.ts` | Pass | Pass | N/A | Pass | Correct retained owner for managed built-in-root materialization and the empty-payload steady state. |
| `autobyteus-server-ts/src/application-bundles/utils/bundled-application-resource-root.ts` | Pass | Pass | N/A | Pass | Correct focused place to tighten bundled source-root resolution so it stays server-owned only. |
| `autobyteus-server-ts/src/application-packages/services/application-package-registry-service.ts` | Pass | Pass | N/A | Pass | Correct authoritative owner for package snapshot composition and cross-surface import/remove/reload orchestration. |
| `autobyteus-server-ts/src/application-packages/stores/application-package-root-settings-store.ts` | Pass | Pass | N/A | Pass | Correct retained persistence boundary for configured additional roots. |
| `autobyteus-server-ts/src/application-packages/stores/application-package-registry-store.ts` | Pass | Pass | N/A | Pass | Correct retained persistence boundary for imported-package records. |
| `autobyteus-server-ts/application-packages/platform/applications/` | Pass | Pass | N/A | Pass | Correct retained built-in payload location, now intentionally empty as a valid steady state. |
| `applications/` | Pass | Pass | N/A | Pass | Correct authoring-only root for current sample/teaching applications. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `BuiltInApplicationPackageMaterializer` -> server-owned payload root -> managed built-in root | Pass | Pass | Pass | Pass | The allowed built-in source direction remains explicit. |
| Authoring/sample roots vs built-in materialization | Pass | Pass | Pass | Pass | The shortcut where repo-root `applications/` silently behaves like built-in packaged content remains explicitly forbidden. |
| `ApplicationPackageRegistryService` -> settings store + registry store -> refresh dependent caches | Pass | Pass | Pass | Pass | The new cleanup direction is coherent: the outer authoritative service owns reconciliation; the stores do not coordinate each other directly. |
| Settings UI remove action vs persistence surfaces | Pass | Pass | Pass | Pass | The UI acts through the service boundary instead of needing its own mismatch-repair logic. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `BuiltInApplicationPackageMaterializer` | Pass | Pass | Pass | Pass | It still has one concrete governing rule instead of leaving built-in source roots implicit. |
| `ApplicationPackageRootSettingsStore` | Pass | Pass | Pass | Pass | It remains a persistence surface; callers are no longer expected to know ahead of time whether a row still exists there. |
| `ApplicationPackageRegistryStore` | Pass | Pass | Pass | Pass | It remains a persistence surface; callers are no longer expected to use it as an alternative cleanup coordinator. |
| `ApplicationPackageRegistryService` | Pass | Pass | Pass | Pass | It is now the clear authoritative entry point for imported-package cleanup reconciliation. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `BuiltInApplicationPackageMaterializer.getBundledSourceRootPath()` | Pass | Pass | Pass | Low | Pass |
| `BuiltInApplicationPackageMaterializer.ensureMaterialized()` | Pass | Pass | Pass | Low | Pass |
| `ApplicationPackageRegistryService.removePackage(...)` | Pass | Pass | Pass | Low | Pass |
| `ApplicationPackageRootSettingsStore.removeAdditionalRootPath(...)` | Pass | Pass | Pass | Low | Pass |
| `ApplicationPackageRegistryStore.removePackageRecord(...)` | Pass | Pass | Pass | Low | Pass |
| `ApplicationPackageRegistryService.getRegistrySnapshot()` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/application-packages/platform/applications/` | Pass | Pass | Low | Pass | Correct retained location for server-owned built-in payload content, currently empty. |
| `applications/` | Pass | Pass | Low | Pass | Correct authoring-only location, not a built-in package folder. |
| `autobyteus-server-ts/src/application-packages/` | Pass | Pass | Low | Pass | Correct subsystem for package registry/materializer/root-protection and removal reconciliation changes. |
| `autobyteus-server-ts/src/application-bundles/utils/bundled-application-resource-root.ts` | Pass | Pass | Low | Pass | Correct small utility placement for bundled built-in source-root resolution logic. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Built-in package root/materializer support | Pass | Pass | N/A | Pass | Correctly reused rather than replaced. |
| Tightened bundled built-in source-root resolution | Pass | Pass | N/A | Pass | Correctly implemented as a refinement of existing built-in boundary logic. |
| Imported-package mismatch cleanup | Pass | Pass | N/A | Pass | Correctly handled by extending the existing registry service instead of inventing a second cleanup subsystem. |
| Empty built-in applications-root steady state | Pass | Pass | N/A | Pass | Existing infrastructure already has the right home; the design keeps that intent explicit. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Duplicate built-in sample app trees | No | Pass | Pass | Correct clean-cut removal remains explicit. |
| Repo-root authoring content as an implicit built-in source | No | Pass | Pass | The design still explicitly forbids this broadened legacy interpretation. |
| Happy-path-only imported package removal that assumes synchronized persistence | No | Pass | Pass | The design now explicitly removes this assumption in favor of authoritative reconciliation cleanup. |
| Built-in package infrastructure itself | Yes | Pass | Pass | Correctly retained because it is still a valid future-facing owner. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Tighten bundled source-root/materializer behavior before or together with payload removal | Pass | Pass | Pass | Pass |
| Update imported-package removal to reconcile settings + registry persistence | Pass | Pass | Pass | Pass |
| Keep managed built-in root valid with zero built-in apps | Pass | Pass | Pass | Pass |
| Verify stale/missing imported rows remain removable from Settings | Pass | Pass | Pass | Pass |
| Remove duplicate built-in sample payloads | Pass | Pass | Pass | Pass |
| Docs and debug/presentation cleanup | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Built-in materialization source boundary | Yes | Pass | Pass | Pass | The good/bad shapes remain short and concrete. |
| Stale imported-package removal reconciliation | Yes | Pass | Pass | Pass | The good/bad shapes clearly distinguish authoritative cleanup from the current broken preconditioned delete path. |
| Future promotion rule | No | N/A | N/A | Pass | Short but adequate for this cleanup ticket. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Future explicit promotion/packaging workflow | It matters later, but this ticket correctly does not need to design the future promotion machinery in detail. | Keep as future follow-up only. | Non-blocking |

## Review Decision

- `Pass`: the design is ready for implementation.
- `Fail`: the design needs upstream rework before implementation should proceed.
- `Blocked`: the review cannot finish because required input, evidence, or clarification is missing.

**Decision: `Pass`**

## Findings

None.

## Classification

`None`

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Documentation and debug surfaces still need comprehensive cleanup so no remaining surface implies that current sample apps are shipped built-ins.
- Implementation should add durable validation for both mismatch removal cases: settings-only stale row and registry-only stale row, including missing-path local packages.
- If a future promotion workflow is added, it must remain an explicit packaging/promotion path and must not recreate an implicit authoring-to-built-in shortcut.

## Latest Authoritative Result

- Review Decision: `Pass`
- Notes: `The expanded cleanup design is implementation-ready. It preserves the explicit built-in payload/source-root boundary and now also makes imported-package removal an authoritative reconciliation cleanup across settings and registry persistence, so stale missing-path rows remain removable.`
