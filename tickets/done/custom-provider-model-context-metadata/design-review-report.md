# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-spec.md`
- Supplemental Task Artifacts Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/qwen-native-provider-setup-ui-spec.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/custom-provider-readable-id-migration-spec.md`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-017` adds the friendly live-Qwen presentation rule; `SR-016` remains authoritative for readable custom identity/reset; `SR-010`–`SR-012` remain authoritative for exact-only custom metadata and native Qwen configuration/catalog/routing
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-011`
- Current Review Round: `11`
- Trigger: Fresh cumulative review after the user's DR-009 hands-on objection to visible internal `qwen:...` selectors and the `SR-017` shared-label-owner response
- Prior Review Round Reviewed: `ARCH-REV-010` (`Pass` for `SR-016`)
- Latest Authoritative Round: `ARCH-REV-011`
- Current-State Evidence Basis: Ticket branch `codex/custom-provider-model-context-metadata` at `331ff94da3c2c9a2a07e11efff68f5307a4cfabb`, ahead `17`/behind `0` relative to recorded `origin/personal` `37660dd61347b630889a698769af5641566357bb`. Review covered the live API-REV-009 browser/API/integrity evidence, Qwen definitions and request adapter, `modelSelectionLabel.ts` and its tests, every current helper consumer, grouped-selection missing-row behavior, and the complete cumulative solution package. Delivery retains tracked-base refresh/integration ownership.

## SR-017 Scope Delta / Complexity Check

- **Change:** For a live catalog row with `providerType === 'QWEN'` and a trimmed nonblank `name`, the existing shared label owner returns the name before the generic default-AutoByteus identifier rule.
- **Preserved identities:** `name` remains presentation, `modelIdentifier` remains selection/persistence/factory identity, and `value` remains provider wire identity.
- **Cross-surface reach:** Settings cards, runtime-scoped agent/team/application/member selectors, binding selectors, and applicable media-default rows already delegate catalog-backed option/selected text to the same helper.
- **Unchanged missing state:** A stored selector with no live catalog row never reaches the helper; its caller continues to show the raw actionable identifier without clearing or guessing.
- **Complexity verdict:** Small and proportionate. One existing policy owner and focused tests replace a visible internal label consistently without a new field, catalog rule, schema, component branch, or routing change.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (`Confirmed`/`Contradicted`/`Blocked`): `Confirmed`
- Approved requirements / intended behavior understood: `Confirmed`. Friendly names are required only for live Qwen catalog presentation. Collision-safe selectors and exact provider wire values remain unchanged.
- Relevant existing behavior and evidence confirmed: `Confirmed`. API-REV-009 reproduces the visible prefixes in real Chrome and proves the live GraphQL row already contains distinct `name`, `modelIdentifier`, `value`, and `providerType`. Current source proves the shared helper governs every identified active catalog-backed Settings/runtime/binding surface, while missing values are synthesized raw by callers.
- Approved change, preserved behavior, and outside scope understood: `Confirmed`. The helper changes text only. Generic non-Qwen built-ins, custom OpenAI-compatible labels, diagnostics/history, persistence, factory routing, request construction, custom identity/reset, Qwen setup, and GraphQL/core catalog shapes remain unchanged.
- Remaining material ambiguity, if any: None.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | User/System | Pass | Pass | Pass | Confirmed | Preserve advertised custom metadata and discovery resilience. |
| `BEH-002` | System/Contract | Pass | Pass | Pass | Confirmed | Preserve exact-value fallback only. |
| `BEH-003` | System/User | Pass | Pass | Pass | Confirmed | Preserve resolved metadata propagation and historical exclusions. |
| `BEH-004` | User | Pass | Pass | Pass | Confirmed | Preserve the implemented Qwen pair-save/status contract. |
| `BEH-005` | User/System | Pass | Pass | Pass | Confirmed | Preserve configured/default native Qwen endpoint behavior. |
| `BEH-006` | User/System | Pass | Pass | Pass | Confirmed | Preserve the exact Qwen catalog, collision-safe selectors, and exact request values. |
| `BEH-007` | User/Operational | Pass | Pass | Pass | Confirmed | Preserve the implemented SR-016 readable identity/reset/recreation behavior. |
| `BEH-008` | User | Pass | Pass | Pass | Confirmed | Use the live Qwen row's trimmed friendly name through the shared label owner; retain exact option identity and raw missing-row labels. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? (`Pass`/`Fail`) | Linked To Relevant Core Artifacts? (`Pass`/`Fail`) | Internally Complete? (`Pass`/`Fail`) | Consistent With Related Core Artifacts? (`Pass`/`Fail`) | Status And Approval Applicability Are Clear? (`Pass`/`Fail`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `qwen-native-provider-setup-ui-spec.md` | Pass | Pass | Pass | Pass | Pass | None; `UXJ-004` specifies live friendly labels, exact selector identity, exact wire value, cross-surface ownership, and raw missing state. |
| `custom-provider-readable-id-migration-spec.md` | Pass | Pass | Pass | Pass | Pass | None; SR-016 authority is unchanged by the presentation-only delta. |

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The package identifies SR-017 as a small presentation behavior change against the implemented cumulative baseline. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | `Missing Invariant` is evidenced by the current helper: custom rows use friendly names, while all other default-AutoByteus rows fall to `modelIdentifier`, exposing internal Qwen collision keys. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | No structural refactor is needed; the existing shared owner and existing `ModelInfo` fields are sufficient. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Source inventory, DS-008, boundaries, file map, examples, rejected alternatives, and focused test sequence all support one narrow helper extension. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001`–`DS-007` | Existing Qwen configuration/routing, custom metadata, readable identity/reset, and missing-selector behavior | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-008` | Live Qwen catalog row to friendly cross-surface text | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `LS-001`–`LS-002` | Exact custom fallback and legacy selector rewrite | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

DS-008 spans the real return path: `Qwen definitions -> GraphQL ModelInfo{name,modelIdentifier,value,providerType} -> web catalog store -> shared modelSelectionLabel -> Settings/runtime/binding option and selected label -> user`. The forward selection/request path remains `friendly row -> exact modelIdentifier -> LLMFactory -> QwenLLM -> exact model.value`.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared `modelSelectionLabel` policy | Pass | Pass | Pass | Pass | It returns display text only; active consumers retain `modelIdentifier` as option identity and do not reimplement Qwen formatting. |
| Catalog/core/GraphQL model row | Pass | Pass | Pass | Pass | Existing fields retain singular presentation, routing, wire, and provider-classification meanings. |
| Settings/runtime/binding consumers | Pass | Pass | Pass | Pass | They delegate catalog-backed text to the helper; caller-owned missing-row synthesis remains outside it. |
| Existing Qwen/custom identity/migration owners | Pass | Pass | Pass | Pass | SR-017 does not cross or reopen these reviewed boundaries. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Web catalog consumers -> shared label policy | Pass | Pass | Pass | Pass | Component-local Qwen label branches and display-text persistence are explicitly forbidden. |
| Label policy -> existing `ModelInfo` projection | Pass | Pass | Pass | Pass | The helper reads existing fields and cannot mutate catalog, storage, routing, or wire values. |
| Selection/persistence -> exact `modelIdentifier` | Pass | Pass | Pass | Pass | Friendly text is never accepted as identity. |
| Qwen adapter -> exact `model.value` | Pass | Pass | Pass | Pass | Existing request construction remains independent of presentation. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `getModelSelectionOptionLabel(model,runtimeKind)` | Pass | Pass | Pass | Low | Pass |
| `getModelSelectionSelectedLabel(providerLabel,model,runtimeKind)` | Pass | Pass | Pass | Low | Pass |
| Existing GraphQL `ModelInfo` | Pass | Pass | Pass | Low | Pass |
| Existing grouped option `{id,name,selectedLabel}` | Pass | Pass | Pass | Low | Pass |

The Qwen condition is appropriately provider-scoped and nonblank-name guarded. It precedes only the generic identifier fallback and therefore leaves the existing custom-friendly and generic non-Qwen cases intact.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Cross-surface Qwen live labels | Pass | Pass | N/A | Pass | The current shared helper already owns all identified active catalog-backed option/selected labels. |
| Friendly Qwen source text | Pass | Pass | N/A | Pass | Existing Qwen catalog `name` is already correct; no definition or API edit is needed. |
| Missing-row repair text | Pass | Pass | N/A | Pass | Existing caller synthesis remains raw and actionable without a historical label map. |
| Identity/routing/wire separation | Pass | Pass | N/A | Pass | Existing `modelIdentifier` and `value` boundaries remain authoritative. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Web model-selection presentation | Pass | Pass | Pass | Pass | Extend the existing shared helper only. |
| Settings/runtime/binding surfaces | Pass | Pass | Pass | Pass | Consume the shared result while retaining exact IDs. |
| Core catalog/GraphQL/Qwen adapter | Pass | Pass | Pass | Pass | Reuse unchanged; no presentation ownership moves server-side. |
| Custom identity/reset and Qwen setup | Pass | Pass | Pass | Pass | Unchanged cumulative owners remain sound. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Catalog-backed option/selected text | Pass | Pass | Pass | Pass | Existing `modelSelectionLabel.ts` is the narrow shared policy owner. |
| Qwen label/selector/value triple | Pass | N/A | Pass | Pass | Existing `ModelInfo` is sufficient; no new reusable DTO or presentation schema is justified. |
| Cumulative identity/config/migration structures | Pass | Pass | Pass | Pass | Unchanged from ARCH-REV-010. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ModelInfo.name` / `modelIdentifier` / `value` / `providerType` | Pass | Pass | Pass | Pass | Pass | Presentation, collision-safe selection/routing, provider wire value, and provider classification remain singular. |
| Grouped option `id` / `name` / `selectedLabel` | Pass | Pass | Pass | Pass | Pass | Only text changes; `id` remains exact selector. |
| Existing Qwen/custom-provider structures | Pass | Pass | Pass | Pass | Pass | SR-017 adds no attribute or alternate representation. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/modelSelectionLabel.ts` | Pass | Pass | Pass | Pass | Add one Qwen/nonblank-name policy before generic identifier fallback. |
| `autobyteus-web/utils/__tests__/modelSelectionLabel.spec.ts` | Pass | Pass | Pass | Pass | Add Qwen option/selected-label assertions while retaining generic/custom regressions. |
| Existing Settings/runtime/binding/media consumers | Pass | Pass | N/A | Pass | No production branch is added; proportionate consumer/browser coverage verifies propagation and exact IDs. |
| `qwen-supported-model-definitions.ts` / Qwen request adapter | Pass | Pass | N/A | Pass | Existing names, selectors, and exact values are reused unchanged. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/modelSelectionLabel.ts` | Pass | Pass | Low | Pass | Existing shared web presentation owner; no new folder or service. |
| Helper and consumer coverage | Pass | Pass | Low | Pass | Focused unit coverage plus Settings and one shared selection surface are proportionate. |
| Existing core/server files | Pass | Pass | Low | Pass | No SR-017 source edit belongs there. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Live Qwen internal selector as user-facing catalog text | Pass | Pass | Pass | Pass | Replace only at the existing shared label branch; do not remove the selector itself. |
| Settings-only/local formatting alternatives | Pass | Pass | Pass | Pass | Explicitly rejected in favor of the shared owner. |
| New display field/generalized presentation schema | Pass | N/A | Pass | Pass | Explicitly rejected as redundant. |
| Earlier endpoint-profile/secret-recovery machinery | Pass | Pass | Pass | Pass | Remains removed under the unchanged SR-016 baseline. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Qwen presentation | No | Pass | Pass | One current rule uses the live row; no historical label map or old/new display path. |
| Missing selector | No | Pass | Pass | Raw identifier is current unavailable-state behavior, not a compatibility label. |
| Identity/routing/wire values | No | Pass | Pass | No alias or alternate selector is introduced. |
| Existing custom migration scope | No | Pass | Pass | Migration-only V1/V2 knowledge and V3-only runtime remain unchanged. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| SR-017 Qwen label presentation | `Not Affected` | Pass | Pass | N/A | Pass | Stored/selected `modelIdentifier` and wire `value` do not change. |
| Existing SR-016 provider reset/selectors | Existing approved decisions retained | Pass | Pass | Pass | Pass | No migration file, ordering, state, or lifecycle change is introduced by SR-017. |
| Existing Qwen key and Base URL | `Directly Usable — No Migration` | Pass | Pass | N/A | Pass | Presentation does not touch configuration. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Shared helper rule and focused unit coverage | Pass | Pass | Pass | Pass |
| Cross-surface consumer/browser verification | Pass | Pass | Pass | Pass |
| Identity/routing/wire regression protection | Pass | Pass | Pass | Pass |
| Downstream review/coverage/delivery repetition for label expectation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Qwen presentation/selector/wire separation | Yes | Pass | Pass | Pass | `DeepSeek V4 Pro (Qwen)` / `qwen:deepseek-v4-pro` / `deepseek-v4-pro` is explicit. |
| Missing live row | Yes | Pass | Pass | Pass | Raw selector remains visible; no guessed name, clear, or fallback. |
| Non-Qwen and custom regression boundary | Yes | Pass | Pass | Pass | Generic built-in identifier labels and custom friendly labels are explicitly preserved. |
| Cumulative migration examples | Yes | Pass | Pass | Pass | Unchanged approved examples remain sufficient. |

## Material Premise Validation (Only When Needed)

No new SR-017 mechanism or finding depends on an assumed failure or lifecycle premise. The user-facing premise is already established directly by `BEH-008`: the exposed Settings/model-selection surfaces and supported browse/select action reach the observed internal-prefix label through the live catalog and shared helper.

The following previously validated premises remain applicable only to unchanged SR-016 migration ordering:

### `PREM-CPMIG-003` — A supported direct upgrade needs old-ID token snapshot recovery before reset

- Related approved requirement or established contract: `BEH-003`, `BEH-007`, `REQ-004`, `REQ-014`; existing required token-usage provider-name snapshot backfill.
- Relevant behavior ID(s): `BEH-003`, `BEH-007`.
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: Server startup on an existing installation whose legacy custom providers and token rows make multiple required migrations pending.
- Support evidence: The existing token backfill resolves an old provider ID to its name, and SR-016 retains it as an exact prerequisite before empty-V3 publication.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `server startup -> token provider-name backfill reads legacy UUID/name through migration-only projection -> remaining prerequisites finish -> final readable reset publishes empty V3`.
- Lifecycle preconditions and material consequence at the claimed point: Old provider names are available before reset and unavailable afterward; correct order preserves the historical name snapshot without retaining a runtime legacy reader.
- Reachability: `Reachable`
- Review consequence / proportionate response: Remains resolved by the unchanged fixed prerequisite and migration-only `{id,name}` reader.

### `PREM-CPMIG-004` — Current selector writers can overwrite transition targets if readable reset runs first

- Related approved requirement or established contract: `REQ-014`, `AC-018`; existing required migrations over run/team/binding metadata.
- Relevant behavior ID(s): `BEH-007`.
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: A supported direct upgrade can make readable identity and current selector-cleanup migrations pending together.
- Support evidence: Current `runPending` executes those definitions in registry order; SR-016 keeps the five exact terminal prerequisites and readable reset final.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `server startup -> current selector writers complete -> final readable definition proves their terminal records -> exact selector attempts -> empty V3 -> terminal gate -> runtime/listen`.
- Lifecycle preconditions and material consequence at the claimed point: No current migration can overwrite a newly mapped selector after reset.
- Reachability: `Reachable`
- Review consequence / proportionate response: Remains resolved by fixed ordering and the final-position invariant; SR-017 does not change it.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`: SR-017 is implementation-ready. It corrects a directly observed user-facing presentation defect at the existing shared owner while preserving the already-correct name/selector/value boundary. The rule propagates through the identified active catalog-backed surfaces, leaves missing selectors raw, and adds no field, schema, persistence, routing, catalog, or generalized presentation machinery.

## Findings

None.

## Classification

`N/A — Pass`

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- A future active catalog selection surface could bypass the shared helper and re-expose internal selectors; focused source review and consumer coverage should enforce use of the existing owner rather than adding a framework.
- A blank Qwen catalog name intentionally falls back to the exact identifier so the UI never renders an empty label.
- Provider-qualified selected text continues to use the existing `providerLabel / optionLabel` composition; SR-017 changes only the option-label component.
- API-REV-009 and DR-009 remain valid evidence for the unchanged GraphQL identity triple, Qwen request value, setup, routing, and SR-016 behavior, but their visible-prefix expectation is superseded. Focused implementation, source review, API/E2E investigation/execution, and delivery packaging must repeat for the new presentation outcome.
- Delivery retains remote refresh/integration ownership; architecture review does not merge, push, archive, clean, or finalize.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass`
- Notes: `ARCH-REV-011` passes `SR-017`. Implement only the shared web label policy and proportionate tests; preserve exact `qwen:...` selectors, exact unprefixed wire values, raw missing-row behavior, generic non-Qwen built-in labels, custom-friendly labels, and the complete implemented SR-016 baseline.
