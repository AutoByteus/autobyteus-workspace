# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/design-spec.md`
- Current Review Round: `14`
- Trigger: `User requested follow-up architecture review on 2026-04-21 after reworking package-registry ownership and startup known-app inventory / NO_PERSISTED_STATE handling`
- Prior Review Round Reviewed: `13`
- Latest Authoritative Round: `14`
- Current-State Evidence Basis: `requirements.md`, `investigation-notes.md`, `design-spec.md`, `design-review-report.md`

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | User requested architecture review on 2026-04-19 | N/A | 3 | Fail | No | Requirements basis was sufficient, but restart recovery, lifecycle observation, and publication-boundary authority were underdesigned. |
| 2 | User requested follow-up review after design rework on 2026-04-19 | 3 | 1 | Fail | No | Round-1 blockers were resolved. One startup-recovery/live-traffic serialization gap remained. |
| 3 | User requested follow-up review after startup-coordination rework on 2026-04-19 | 1 | 0 | Pass | No | The explicit startup gate, gated live paths, and fatal failure contract resolved the remaining blocker from round 2. |
| 4 | User requested follow-up review after deepening the authoritative app-API design on 2026-04-19 | 0 | 0 | Pass | No | The hosted backend-mount/base-url boundary, app-vs-platform schema ownership split, and sample-app teaching direction became concrete enough for implementation. |
| 5 | User requested follow-up review after switching to binding-centric cross-boundary correlation on 2026-04-19 | 0 | 1 | Fail | No | The ownership intent was cleaner, but the direct `startRun(...)` correlation-establishment contract was still underdesigned. |
| 6 | User requested follow-up review after adding pending-intent plus `bindingIntentId` reconciliation on 2026-04-19 | 1 | 0 | Pass | Yes | The direct-start handoff is now explicit, restart-safe, and coherent with binding-centric correlation. |
| 7 | User requested follow-up review after adding invalid-app startup isolation plus persisted resource-configuration rework on 2026-04-20 | 0 | 2 | Fail | Yes | Startup isolation intent improved, but quarantine-exit re-entry and authoritative resource-slot declaration/validation remained underdesigned. |
| 8 | User requested follow-up review after adding `ApplicationAvailabilityService` and manifest-declared `resourceSlots` on 2026-04-20 | 2 | 0 | Pass | Yes | The package now defines one authoritative app-availability re-entry spine and one authoritative slot-declaration/validation contract. |
| 9 | User requested follow-up review after refining application-mode `autoExecuteTools` behavior and business-first teaching-app UI direction on 2026-04-20 | 0 | 0 | Pass | Yes | The generic host now chooses one actionable application-mode tool-approval behavior, and the teaching apps clarify business-first UI without reopening ownership gaps. |
| 10 | User requested follow-up review after refining the pre-entry configuration gate and `supportedLaunchDefaults` behavior on 2026-04-20 | 0 | 0 | Pass | Yes | The host pre-entry configuration gate is now explicit, uses manifest-declared host-understood defaults, and keeps business-first app canvases free of low-level runtime tuning without reopening ownership gaps. |
| 11 | User requested follow-up review after refining business-first UI wording, advanced/details runtime surfaces, and pre-entry configuration UX mirroring on 2026-04-20 | 0 | 0 | Pass | Yes | Legitimate business actions stay in-app, raw runtime vocabulary moves to advanced/details surfaces, and the pre-entry host gate now mirrors the familiar configuration form without reopening ownership gaps. |
| 12 | User requested follow-up review on the latest authoritative package after consolidating business-first application UX, advanced/details runtime surfaces, and catalog/setup guidance on 2026-04-20 | 0 | 0 | Pass | Yes | The latest package keeps business actions in-app, demotes raw runtime vocabulary and resource details to advanced/details surfaces, and keeps the pre-entry host setup gate authoritative without reopening ownership gaps. |
| 13 | User requested follow-up review after the desktop-startup robustness redesign on 2026-04-21 | 0 | 2 | Fail | Yes | The redesign correctly separates bundle-independent persisted-state access in principle, but the new package-registry boundary and startup known-app inventory/outcome contract are still underdesigned. |
| 14 | User requested follow-up review after reworking package-registry ownership and startup known-app inventory / `NO_PERSISTED_STATE` handling on 2026-04-21 | 2 | 0 | Pass | Yes | The package registry is now a concrete authoritative boundary, and startup inventory plus outcome-to-availability mapping are now explicit enough for implementation. |

## Reviewed Design Spec

The requirements basis remains sufficient and design-ready.

The latest package resolves both round-13 blockers without reopening earlier ones:
- the new `application-packages` boundary is now concrete. `ApplicationPackageRegistryService` owns imported package roots, package metadata, package-level diagnostics, and import/remove/reload flows; `ApplicationPackageRegistrySnapshot` gives the package-registry subject one shared authoritative shape; and `ApplicationBundleService` now explicitly consumes registry output instead of reading package-root stores directly.
- the startup known-app inventory is now concrete and bundle-independent. `ApplicationPlatformStateStore.listKnownApplicationIds()` and `getExistingStatePresence(applicationId)` give recovery one authoritative inventory/presence boundary under `application-storage` rather than leaving inventory logic scattered across binding/journal callers.
- `ApplicationAvailabilityService.applyStartupRecoveryOutcome(...)` now makes the `NO_PERSISTED_STATE` branch explicit, including the important steady-state rule that `CATALOG_ACTIVE + NO_PERSISTED_STATE -> ACTIVE` while quarantined or persisted-only cases remain non-admitted.
- the package-registry spine (`DS-012`) and startup-recovery spine (`DS-007` / `DS-011`) now fit together cleanly: package import/remove/reload updates registry state and diagnostics, bundle discovery derives the app catalog from that registry boundary, and availability/recovery react to catalog plus persisted-state inputs without boundary bypass.

These reworks make the desktop-startup robustness redesign concrete enough for implementation. No new blocking design gaps were found in this round.

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `AOR-DI-001` | High | Resolved | `Architecture Review Rework Coverage`, `DS-007`, `Restart Recovery / Resume Contract`, `Migration / Refactor Sequence` | Recovery still has an explicit owner, spine, algorithm, and startup ordering relative to dispatch resume. |
| 1 | `AOR-DI-002` | High | Resolved | `Architecture Review Rework Coverage`, `Lifecycle Observation Contract`, `ApplicationBoundRunLifecycleGateway`, service/manager file mappings | Lifecycle observation remains designed as subject-owned service boundaries plus one orchestration-facing adapter. |
| 1 | `AOR-DI-003` | Medium | Resolved | `Architecture Review Rework Coverage`, `Execution Event Ingress Authority`, `Boundary Encapsulation Map`, `Dependency Rules` | Journal append authority remains centralized behind `ApplicationExecutionEventIngressService`. |
| 2 | `AOR-DI-004` | High | Resolved | `Architecture Review Rework Coverage`, `DS-007`, `Startup Coordination / Traffic Admission Contract`, `Boundary Encapsulation Map`, `Dependency Rules`, `Migration / Refactor Sequence` | Startup readiness still has one explicit owner plus concrete enforcement points for live runtime-control and live artifact ingress. |
| 5 | `AOR-DI-005` | High | Resolved | `Architecture Review Rework Coverage`, `Binding-Centric Correlation Principle`, `Direct startRun(...) Correlation Establishment Contract`, `DS-002`, `Execution Event Ingress Authority`, `Interface Boundary Mapping`, `Example App Implementation Shape`, `Migration / Refactor Sequence`, `Guidance For Implementation` | The direct-start handoff remains explicit through pending intent, echoed `bindingIntentId`, and authoritative reconciliation lookup. |
| 7 | `AOR-DI-006` | High | Resolved | `Quarantined Application Repair / Reload Re-entry Principle`, `DS-010`, `Restart Recovery / Resume Contract`, `Interface Boundary Mapping`, `Migration / Refactor Sequence` | App repair/reload now has one authoritative owner, state machine, re-entry algorithm, and explicit live-traffic behavior. |
| 7 | `AOR-DI-007` | Medium | Resolved | `Authoritative Resource-Slot Declaration / Validation Principle`, `ApplicationManifestV3.resourceSlots`, `Ownership Map`, `Interface Boundary Mapping`, `Migration / Refactor Sequence` | Slot declaration home, minimum schema, and validation split are now explicit enough for implementation. |
| 13 | `AOR-DI-008` | High | Resolved | `Persisted Subject Separation Principle`, `DS-007`, `DS-012`, `Ownership Map`, `Draft File Responsibility Mapping`, `Target Subsystem / Folder / File Mapping`, `Interface Boundary Mapping` | The package registry now has one concrete owner, snapshot shape, file mapping, and interface boundary under `application-packages`. |
| 13 | `AOR-DI-009` | High | Resolved | `Bundle-Independent Persisted Platform State Access Principle`, `Startup Known-Application Inventory Principle`, `DS-007`, `DS-011`, `Per-Application Startup Recovery Outcome Contract`, `Outcome-to-availability mapping`, `Ownership Map`, `Interface Boundary Mapping` | Startup inventory, existing-state presence probing, and `NO_PERSISTED_STATE` admission behavior are now explicit enough for implementation. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Engine-first application launch with backend mount descriptor | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-002` | Pending-intent-backed app-owned run creation and durable binding establishment | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-007` | Startup recovery and invalid-app quarantine | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-008` | Hosted business API call over the app-scoped backend mount | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-009` | Persisted application resource configuration | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-010` | Quarantined-app repair/reload re-entry | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `application-bundles` | Pass | Pass | Pass | Pass | Best-effort discovery, diagnostics, manifest slot declarations, and targeted reload validation now sit under one coherent owner. |
| `application-orchestration` | Pass | Pass | Pass | Pass | Availability/re-entry, persisted resource configuration, runtime control, recovery, ingress, and dispatch now line up under the right subsystem. |
| `autobyteus-web Applications host` | Pass | Pass | Pass | Pass | Host-side setup remains clearly separated from run launch. |
| `application-backend-gateway` | Pass | Pass | Pass | Pass | The gateway still has a coherent transport-hosting role and now checks app availability explicitly. |
| app-owned pending-intent/correlation services | Pass | Pass | Pass | Pass | The binding-centric handoff remains well owned. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Application catalog snapshot + invalid diagnostics | Pass | Pass | Pass | Pass | Good shared discovery/quarantine shape. |
| Resource slot declarations + persisted configuration vocabulary | Pass | Pass | Pass | Pass | Manifest-declared slot metadata plus persisted configuration now form one coherent shared vocabulary. |
| Binding summary / event envelope | Pass | Pass | Pass | Pass | The binding-centric structures remain tight and coherent. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ApplicationCatalogSnapshot` | Pass | Pass | Pass | Pass | Pass | The valid-vs-diagnostics split remains clear. |
| `ApplicationResourceConfiguration` + `ApplicationManifestV3.resourceSlots` | Pass | Pass | Pass | Pass | Pass | The declaration-vs-persisted-state split is now explicit and semantically tight. |
| `ApplicationRunBindingSummary` | Pass | Pass | Pass | Pass | Pass | The binding-centric model remains tight. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| fatal-on-first-invalid bundle cache population | Pass | Pass | Pass | Pass | Correctly removed in favor of best-effort snapshotting plus diagnostics. |
| Host launch modal run-launch semantics | Pass | Pass | Pass | Pass | Correctly repurposed toward persisted setup instead of launch-now behavior. |
| Session-owned launch/orchestration | Pass | Pass | Pass | Pass | Clean-cut replacement remains explicit. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-bundles/domain/application-catalog-snapshot.ts` | Pass | Pass | N/A | Pass | Good single discovery/quarantine shape. |
| `autobyteus-server-ts/src/application-orchestration/services/application-availability-service.ts` | Pass | Pass | N/A | Pass | Good singular owner for app-scoped re-entry. |
| `autobyteus-server-ts/src/application-orchestration/services/application-resource-configuration-service.ts` | Pass | Pass | N/A | Pass | Good single owner for persisted setup plus manifest-backed validation. |
| `autobyteus-server-ts/src/application-orchestration/stores/application-resource-configuration-store.ts` | Pass | Pass | N/A | Pass | The store has one clear durable-setup concern. |
| `autobyteus-web/components/applications/ApplicationResourceConfigurationModal.vue` | Pass | Pass | N/A | Pass | The repurposed host UI concern is singular and correctly separated from run launch. |
| `autobyteus-application-sdk-contracts/src/manifests.ts` | Pass | Pass | N/A | Pass | Correct shared home for authoritative slot declarations. |
| `autobyteus-server-ts/src/server-runtime.ts` | Pass | Pass | N/A | Pass | Startup-hook responsibility remains limited and clear. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ApplicationAvailabilityService` -> reload/recovery/dispatch re-entry interaction | Pass | Pass | Pass | Pass | The re-entry owner now cleanly governs its collaborators instead of leaving them to improvise availability logic. |
| `ApplicationResourceConfigurationService` -> manifest slot declarations + config store + runtimeControl readback | Pass | Pass | Pass | Pass | Declaration authority and persisted-state validation are now coherently split. |
| `ApplicationOrchestrationStartupGate` | Pass | Pass | Pass | Pass | The gate remains an authoritative readiness boundary. |
| `ApplicationExecutionEventIngressService` | Pass | Pass | Pass | Pass | Ingress authority remains coherent. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ApplicationAvailabilityService` | Pass | Pass | Pass | Pass | Quarantine exit/re-entry is no longer an implied side effect of ad hoc reload behavior. |
| `ApplicationBundleService` | Pass | Pass | Pass | Pass | Discovery, diagnostics, reload validation, and manifest declarations stay inside the right boundary. |
| `ApplicationResourceConfigurationService` | Pass | Pass | Pass | Pass | Host setup and app readback now share one clear declaration/validation source of truth. |
| `ApplicationOrchestrationStartupGate` | Pass | Pass | Pass | Pass | Startup readiness remains properly encapsulated. |
| `ApplicationExecutionEventIngressService` | Pass | Pass | Pass | Pass | Event ingress authority remains clean. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `ApplicationBundleService.getCatalogSnapshot()` | Pass | Pass | Pass | Low | Pass |
| `ApplicationBundleService.reloadApplication(applicationId)` | Pass | Pass | Pass | Low | Pass |
| `ApplicationAvailabilityService.reloadAndReenter(applicationId)` | Pass | Pass | Pass | Low | Pass |
| `ApplicationResourceConfigurationService.upsertConfiguration(applicationId, slotKey, input)` | Pass | Pass | Pass | Low | Pass |
| `ApplicationResourceConfigurationService.listConfigurations(applicationId)` | Pass | Pass | Pass | Low | Pass |
| `runtimeControl.getConfiguredResource(slotKey)` | Pass | Pass | Pass | Low | Pass |
| `runtimeControl.startRun(input)` | Pass | Pass | Pass | Low | Pass |
| `publish_artifact(...)` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-bundles/domain/application-catalog-snapshot.ts` | Pass | Pass | Low | Pass | Correct home for discovery/quarantine state. |
| `autobyteus-server-ts/src/application-orchestration/services/application-availability-service.ts` | Pass | Pass | Low | Pass | Correct home for app-scoped re-entry ownership. |
| `autobyteus-server-ts/src/application-orchestration/services/application-resource-configuration-service.ts` | Pass | Pass | Low | Pass | Correct home for persisted setup ownership. |
| `autobyteus-application-sdk-contracts/src/manifests.ts` | Pass | Pass | Low | Pass | Correct shared contract home for `resourceSlots`. |
| `autobyteus-web/components/applications/ApplicationResourceConfigurationModal.vue` | Pass | Pass | Low | Pass | Correct browser host home for the repurposed setup surface. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Invalid-app diagnostics/quarantine at startup | Pass | Pass | Pass | Pass | The extension direction remains sound. |
| Quarantined-app repair/reload re-entry into orchestration | Pass | Pass | Pass | Pass | `ApplicationAvailabilityService` is a justified new owner. |
| Persisted application resource configuration | Pass | Pass | Pass | Pass | Reusing the form UX while changing semantics remains the right product/architecture move. |
| Resource-slot declaration/validation contract | Pass | Pass | Pass | Pass | Manifest declaration authority is the right reuse/extension choice. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Host run-launch semantics | No | Pass | Pass | Correctly rejected in favor of persisted setup. |
| Session-owned launch/orchestration | No | Pass | Pass | Clean-cut removal stance remains intact. |
| `runtimeTarget` simple-path retention | No | Pass | Pass | Still correctly rejected. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Best-effort invalid-app quarantine at startup | Pass | Pass | Pass | Pass |
| Quarantined-app repair/reload -> recovery -> dispatch re-entry | Pass | Pass | Pass | Pass |
| Contract-first resource-slot metadata + host setup + runtimeControl readback | Pass | Pass | Pass | Pass |
| Host launch-form repurpose away from run creation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Invalid application isolation at startup | Yes | Pass | Pass | Pass | The startup isolation example remains clear. |
| Persisted application resource configuration | Yes | Pass | Pass | Pass | The setup-vs-launch example remains clear. |
| Quarantined-app repair/reload re-entry | No | N/A | N/A | Pass | The new DS-010 spine and re-entry algorithm are concrete enough without an extra example row. |
| Resource-slot declaration / validation contract | No | N/A | N/A | Pass | The manifest code shape and surface rules are concrete enough without another illustrative example. |
| Application-mode auto-approved tool execution | No | N/A | N/A | Pass | The host-facing rule is concrete: `autoExecuteTools` stays visible-but-locked to `true`, there is no editable approval toggle, and no fake generic approval loop reappears. |
| Business-first teaching-app UI direction | No | N/A | N/A | Pass | The teaching apps now clearly keep business workflow actions in-app, prefer domain labels such as `Generate draft`, and push low-level runtime identifiers/tuning out of the main canvas. |
| Pre-entry configuration gate | No | N/A | N/A | Pass | The host-managed gate is explicit enough: it happens before app entry, may show on every launch with saved values prefilled, mirrors the familiar agent/team setup form including workspace root path, and still does not create runs. |
| Manifest-declared `supportedLaunchDefaults` | No | N/A | N/A | Pass | The host-understood default field set is bounded and concrete enough for implementation without drifting into generic app policy. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Shared-platform resource authorization policy | Still a real product concern, but it remains correctly out of scope here. | Keep out of this implementation unless separately scoped. | Non-blocking |
| Generic host-native retained execution UI | Product may later want richer host-native views again, but the current design still correctly leaves that outside the governing owner model. | Keep as follow-up only. | Non-blocking |

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

- The worker->host orchestration bridge still needs disciplined implementation so it does not become a generic service locator.
- Execution-owner lifecycle extensions still need to land consistently across agent and team paths.
- `ApplicationAvailabilityService` and the app-scoped recovery slice must be implemented carefully so lookup rebuild and dispatch resume preserve the intended durable event-routing guarantees during re-entry.
- Manifest parsing and `ApplicationResourceConfigurationService` validation must stay aligned so slot declarations and persisted configuration do not drift.
- The sample-app upgrades remain part of the authoritative design package, so incomplete migration would keep the repo teaching the wrong model.
- If manual tool-approval is introduced later for application-owned orchestration, it must come back as explicit app-owned UX rather than leaking into the generic host configuration surface.
- If the pre-entry host gate later grows beyond the bounded host-understood defaults in `supportedLaunchDefaults`, that expansion should be treated as new app/host boundary design work rather than silently extending the generic form.

## Latest Authoritative Result

- Review Decision: `Pass`
- Notes: `The updated package resolves the desktop-startup robustness blockers: package-registry ownership is now concrete under application-packages, and bundle-independent startup inventory plus explicit NO_PERSISTED_STATE availability mapping are now concrete enough for implementation.`
