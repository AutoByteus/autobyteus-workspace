# Design Review Report

Write this artifact to a canonical file path in the assigned task workspace before any handoff message.

Keep one canonical design-review report path across reruns.
Do not create versioned copies by default.
On round `>1`, recheck prior unresolved findings first, update the prior-findings resolution section, and then record the new round result.
The latest round is authoritative; earlier rounds remain history.

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-package-ux-cleanup/tickets/in-progress/application-package-ux-cleanup/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-package-ux-cleanup/tickets/in-progress/application-package-ux-cleanup/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-package-ux-cleanup/tickets/in-progress/application-package-ux-cleanup/design-spec.md`
- Current Review Round: `4`
- Trigger: architecture re-review after upstream rework intended to close `AR-001`
- Prior Review Round Reviewed: `3`
- Latest Authoritative Round: `4`
- Current-State Evidence Basis:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-package-ux-cleanup/tickets/in-progress/application-package-ux-cleanup/requirements.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-package-ux-cleanup/tickets/in-progress/application-package-ux-cleanup/investigation-notes.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-package-ux-cleanup/tickets/in-progress/application-package-ux-cleanup/design-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-package-ux-cleanup/autobyteus-web/utils/application/applicationLaunch.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-package-ux-cleanup/autobyteus-web/stores/__tests__/applicationLaunchPreparation.integration.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-package-ux-cleanup/autobyteus-server-ts/src/agent-team-definition/providers/application-owned-team-source.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-package-ux-cleanup/autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-package-ux-cleanup/autobyteus-server-ts/src/agent-definition/providers/application-owned-agent-source.ts`

Round rules:
- Reuse the same finding IDs across reruns for the same unresolved design-review issues.
- Create new finding IDs only for newly discovered issues.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `1` | initial design review | `N/A` | `1` | `Fail` | `No` | The package-presentation and shared launch-preferences direction was strong, but the team-defaults refactor left the application-owned team-definition path underspecified while removing the old application-launch fallback. |
| `2` | re-review from the current package state | `1` | `0` | `Fail` | `No` | No material design change closed AR-001; the spec still removed leaf-agent aggregation without explicitly covering or excluding application-owned team definitions in the replacement path. |
| `3` | user-requested architecture re-review after reviewer handoff | `1` | `0` | `Fail` | `No` | Recheck confirmed the same blocker. AR-001 remained unresolved in the upstream package at that point. |
| `4` | re-review after explicit upstream AR-001 rework | `1` | `0` | `Pass` | `Yes` | The revised package now explicitly carries application-owned team definitions through the same team-level `defaultLaunchConfig` model, parser/write path, dependency rules, and migration sequence. |

## Reviewed Design Spec

The revised package is now ready for implementation.

The critical change is that the design no longer stops at the shared/team-config-backed team-definition path. It now explicitly covers the full team-definition subject across ownership scopes:
- requirements now state that shared and application-owned team definitions participate in the same preferred-launch-settings capability;
- investigation notes now ground that decision in current code reality, including the existing application-owned team parser/write path and existing application-launch coverage;
- the design now maps `application-owned-team-source.ts`, `file-agent-team-definition-provider.ts`, and the shared launch-default normalizer into the target structure;
- migration sequencing now requires extending both shared-team and application-owned-team config paths before removing the old `applicationLaunch.ts` leaf-agent aggregation;
- dependency and boundary rules now explicitly forbid ownership-scope-specific fallback logic in `applicationLaunch.ts`.

That closes `AR-001`.

I did not find a new blocking design issue in the revised upstream package. The remaining concerns are implementation risks already called out in the package, not design blockers.

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| `3` | `AR-001` | `High` | `Resolved` | Requirements now explicitly include shared and application-owned team definitions in `REQ-015`, `REQ-019`, `REQ-021` and `AC-012`, `AC-014`; investigation notes explicitly identify `application-owned-team-source.ts` and `FileAgentTeamDefinitionProvider.update(...)` as the existing path to extend; design spec now maps `application-owned-team-source.ts`, `file-agent-team-definition-provider.ts`, shared normalizer ownership, migration ordering, and ownership-agnostic `applicationLaunch.ts` consumption into the replacement model. | The prior blocker is now closed. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Settings Application Packages -> safe list rows | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-002` | startup / refresh -> managed built-in root | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-003` | agent definition editor -> persisted agent defaults | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-004` | team definition editor -> persisted team defaults | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-005` | launch surface / application prep -> prefilled run config | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-006` | runtime/model/config local interaction loop | `Pass` | `Pass` | `N/A` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-007` | package mutation -> refreshed dependent catalogs | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `application-packages` | `Pass` | `Pass` | `Pass` | `Pass` | Correct owner for source-kind presentation rules and built-in materialization. |
| `application-bundles` | `Pass` | `Pass` | `Pass` | `Pass` | Keeping bundled resources as read-only materialization source is coherent. |
| `agent-definition` | `Pass` | `Pass` | `Pass` | `Pass` | Existing agent `defaultLaunchConfig` ownership remains clear. |
| `agent-team-definition` | `Pass` | `Pass` | `Pass` | `Pass` | The revised design now explicitly covers both shared and application-owned team-definition persistence paths as one subject boundary. |
| web launch-preferences UI | `Pass` | `Pass` | `Pass` | `Pass` | Shared subsection extraction is the right reuse boundary. |
| Settings application-packages UI | `Pass` | `Pass` | `Pass` | `Pass` | Correctly kept as a consumer of safe package rows rather than a business-policy owner. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| server-side `defaultLaunchConfig` shape | `Pass` | `Pass` | `Pass` | `Pass` | The shared shape remains tight and ownership is now explicit across both team source paths. |
| web-side definition launch config shape | `Pass` | `Pass` | `Pass` | `Pass` | The web shape is narrowly scoped enough. |
| runtime/model/config interaction loop | `Pass` | `Pass` | `Pass` | `Pass` | Extracting a reusable subsection instead of whole run forms remains the right move. |
| package list item vs debug details contract | `Pass` | `Pass` | `Pass` | `Pass` | Good split between safe default-visible data and raw internals. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `DefaultLaunchConfig` shared shape | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | The shape is still appropriately narrow and now explicitly shared across team ownership scopes. |
| `ApplicationPackageListItem` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | The safe outward list contract is well scoped. |
| `ApplicationPackageDebugDetails` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | The details path remains correctly separated from the default list. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| upward-scanned built-in package root as outward built-in identity | `Pass` | `Pass` | `Pass` | `Pass` | Clean-cut replacement with managed server-data root is explicit. |
| always-show empty built-in row | `Pass` | `Pass` | `Pass` | `Pass` | Hiding empty built-ins is explicitly owned by package list composition. |
| raw built-in path exposure in default list | `Pass` | `Pass` | `Pass` | `Pass` | Safe list/detail split is explicit. |
| old `isDefault` built-in UI concept | `Pass` | `Pass` | `Pass` | `Pass` | Replacing it with platform-owned presentation is coherent. |
| `AgentDefaultLaunchConfigFields.vue` raw editor | `Pass` | `Pass` | `Pass` | `Pass` | Removal is explicit and correct. |
| direct launch template creation that ignores stored definition defaults | `Pass` | `Pass` | `Pass` | `Pass` | Resolver-based replacement is explicit. |
| leaf-agent team-default aggregation inside `applicationLaunch.ts` | `Pass` | `Pass` | `Pass` | `Pass` | Replacement ownership is now explicit across both shared and application-owned team source paths, with removal sequencing stated clearly. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-packages/services/application-package-service.ts` | `Pass` | `Pass` | `Pass` | `Pass` | Correct authoritative package-source boundary. |
| `autobyteus-server-ts/src/application-packages/services/built-in-application-package-materializer.ts` | `Pass` | `Pass` | `Pass` | `Pass` | Correct lifecycle owner for managed built-in storage. |
| `autobyteus-server-ts/src/application-packages/stores/application-package-root-settings-store.ts` | `Pass` | `Pass` | `Pass` | `Pass` | Good home for root-path truth once built-in root moves to managed storage. |
| `autobyteus-web/components/settings/ApplicationPackagesManager.vue` | `Pass` | `Pass` | `Pass` | `Pass` | Correct page-level consumer of safe package rows. |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | `Pass` | `Pass` | `Pass` | `Pass` | Good shared bounded-local owner. |
| `autobyteus-web/components/launch-config/DefinitionLaunchPreferencesSection.vue` | `Pass` | `Pass` | `Pass` | `Pass` | Good shared editor-section owner. |
| `autobyteus-web/composables/useDefinitionLaunchDefaults.ts` | `Pass` | `Pass` | `Pass` | `Pass` | The shared prefill-policy owner is the right new file. |
| `autobyteus-web/utils/application/applicationLaunch.ts` | `Pass` | `Pass` | `Pass` | `Pass` | Correctly constrained to a consumer role with no ownership-scope-specific fallback logic. |
| `autobyteus-server-ts/src/agent-team-definition/providers/team-definition-config.ts` | `Pass` | `Pass` | `Pass` | `Pass` | Correct shared-team persistence file for team defaults. |
| `autobyteus-server-ts/src/agent-team-definition/providers/application-owned-team-source.ts` | `Pass` | `Pass` | `Pass` | `Pass` | The revised design now gives this file an explicit role in the same team-default contract. |
| `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | `Pass` | `Pass` | `Pass` | `Pass` | Correct routing boundary for one team-definition subject across ownership scopes. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ApplicationPackageService` | `Pass` | `Pass` | `Pass` | `Pass` | Correctly kept authoritative over list/details presentation policy. |
| `BuiltInApplicationPackageMaterializer` | `Pass` | `Pass` | `Pass` | `Pass` | Good clean separation from UI-facing formatting. |
| `AgentDefinitionService` | `Pass` | `Pass` | `Pass` | `Pass` | Existing agent defaults ownership remains sound. |
| `AgentTeamDefinitionService` | `Pass` | `Pass` | `Pass` | `Pass` | The revised design now reconciles shared and application-owned team-definition ingestion under one authoritative boundary. |
| `DefinitionLaunchDefaultsResolver` | `Pass` | `Pass` | `Pass` | `Pass` | Correct consumer-side prefill owner. |
| `RuntimeModelConfigFields.vue` | `Pass` | `Pass` | `Pass` | `Pass` | Good reuse boundary for runtime/model/config coordination. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ApplicationPackageService` | `Pass` | `Pass` | `Pass` | `Pass` | Strong package list/details boundary. |
| `BuiltInApplicationPackageMaterializer` | `Pass` | `Pass` | `Pass` | `Pass` | Good explicit lifecycle owner. |
| `AgentDefinitionService` | `Pass` | `Pass` | `Pass` | `Pass` | Existing boundary remains correct. |
| `AgentTeamDefinitionService` | `Pass` | `Pass` | `Pass` | `Pass` | Team launch-default ownership is now explicitly unified across shared and application-owned team sources. |
| `DefinitionLaunchDefaultsResolver` | `Pass` | `Pass` | `Pass` | `Pass` | Good authoritative consumer boundary for launch prefill. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `ApplicationPackageService.listApplicationPackages()` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| `ApplicationPackageService.getApplicationPackageDetails(packageId)` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| `BuiltInApplicationPackageMaterializer.ensureMaterialized()` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| `AgentDefinitionService.create/updateDefinition(...defaultLaunchConfig...)` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| `AgentTeamDefinitionService.create/updateDefinition(...defaultLaunchConfig...)` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| `DefinitionLaunchDefaultsResolver.buildAgentRunTemplate(agentDefinition)` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| `DefinitionLaunchDefaultsResolver.buildTeamRunTemplate(teamDefinition)` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-packages/` | `Pass` | `Pass` | `Low` | `Pass` | Correct home for package-source policy and materialization. |
| `autobyteus-server-ts/src/launch-preferences/` | `Pass` | `Pass` | `Medium` | `Pass` | Small new shared subsystem is justified by real cross-definition reuse. |
| `autobyteus-web/components/launch-config/` | `Pass` | `Pass` | `Low` | `Pass` | Correct reuse boundary for shared runtime/model/config UI. |
| `autobyteus-web/components/settings/` | `Pass` | `Pass` | `Low` | `Pass` | Correct page-level placement for the package UI consumer. |
| `autobyteus-server-ts/src/agent-team-definition/providers/application-owned-team-source.ts` | `Pass` | `Pass` | `Low` | `Pass` | The revised package now gives the application-owned team source path explicit placement and ownership. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| package source list/import/remove ownership | `Pass` | `Pass` | `N/A` | `Pass` | Correctly extends the existing application-packages boundary. |
| managed package storage under server-data | `Pass` | `Pass` | `N/A` | `Pass` | Reusing the GitHub managed-storage pattern is sensible. |
| built-in bundled app source lookup | `Pass` | `Pass` | `N/A` | `Pass` | Correctly stays on the read-only bundle side. |
| agent definition launch-default persistence | `Pass` | `Pass` | `N/A` | `Pass` | Existing agent path is reused correctly. |
| team definition launch-default persistence | `Pass` | `Pass` | `N/A` | `Pass` | The revised design now extends the full team-definition subject, including the application-owned team source path. |
| shared runtime/model/config interaction UX | `Pass` | `Pass` | `Pass` | `Pass` | Good shared-subsection extraction. |
| shared launch-default-to-run-template mapping | `Pass` | `Pass` | `Pass` | `Pass` | New resolver is justified because current policy is fragmented. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| old built-in row semantics | `No` | `Pass` | `Pass` | Good clean-cut replacement. |
| raw built-in path in default list | `No` | `Pass` | `Pass` | Good clean-cut removal. |
| old agent launch-default editor component | `No` | `Pass` | `Pass` | Good clean-cut replacement. |
| leaf-agent team-default aggregation in application launch | `No` | `Pass` | `Pass` | Removal is now explicit and safely staged after both team source paths carry the new contract. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| package list/detail contract split | `Pass` | `Pass` | `Pass` | `Pass` |
| managed built-in root introduction | `Pass` | `Pass` | `Pass` | `Pass` |
| agent launch-preference UX cleanup | `Pass` | `Pass` | `Pass` | `Pass` |
| team definition launch-preference support | `Pass` | `Pass` | `Pass` | `Pass` |
| shared launch-defaults resolver cutover | `Pass` | `Pass` | `Pass` | `Pass` |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| package list contract | `Yes` | `Pass` | `Pass` | `Pass` | The good vs bad outward contract example is clear. |
| built-in storage model | `Yes` | `Pass` | `Pass` | `Pass` | The materialized-root example is clear. |
| team launch defaults | `Yes` | `Pass` | `Pass` | `Pass` | The example now explicitly covers both shared and application-owned team definitions and rejects ownership-scope branching in `applicationLaunch.ts`. |
| shared launch-preference UI | `Yes` | `Pass` | `Pass` | `Pass` | The shared subsection example is concrete enough. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| `None` | `N/A` | `N/A` | `Closed` |

## Review Decision

- `Pass`: the design is ready for implementation.
- `Fail`: the design needs upstream rework before implementation should proceed.
- `Blocked`: the review cannot finish because required input, evidence, or clarification is missing.

**Current decision: `Pass`**

## Findings

None.

## Classification

`None`

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Shared-team and application-owned-team config parsing still need to stay aligned on the same shared `defaultLaunchConfig` normalizer during implementation.
- Application-owned team updates still depend on source writability and the existing read-only-source boundaries; implementation should preserve that guardrail.
- `AppDataDir/application-packages/platform` remains the leading built-in managed-root choice and should be locked consistently during implementation.
- The package list/details split must remain authoritative at `ApplicationPackageService`; the UI should not drift back toward formatting raw source/path data itself.

## Latest Authoritative Result

- Review Decision: `Pass`
- Notes: `AR-001` is closed. The revised design now explicitly covers application-owned team definitions in the same team-level `defaultLaunchConfig` model, parser/write path, dependency rules, and migration sequence, so the package is ready to implement.
