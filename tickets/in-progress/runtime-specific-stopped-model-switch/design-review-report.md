# Design Review Report — Runtime-specific stopped-run model switching

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/requirements-doc.md` (Approved, SR-002)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/investigation-notes.md` (E01–E15, AE-01–AE-09)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/design-spec.md` (SR-003)
- Supplemental Task Artifacts Reviewed: user screenshot and read-only predecessor package as indexed in investigation notes; no behavior-defining supplement or Product prototype.
- Relevant Solution Revision IDs: SR-001–003; approved basis SR-002, reviewed design SR-003.
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: ARCH-REV-001
- Current Review Round: 1
- Trigger: High-risk completed architecture-design handoff.
- Prior Review Round Reviewed: N/A; no prior architecture-review result.
- Latest Authoritative Round: 1.
- Current-State Evidence Basis: source inspection of `run-model-selection-service.ts`, capacity service, catalog, GraphQL option type, Web picker/composable/store, Agent/Team/Org stopped Save owners, and Org query facade in this worktree; E01–E15/AE-01–AE-09. No code change, test execution or live provider probe in this review.

## Routing Classification Review

- Task size: **Medium**.
- Architectural risk: **High**.
- Classification rationale reviewed: shared eligibility owner and GraphQL/Web option-shape removal reach Agent, Team and Org; restore/provider continuation is a preserved but unverified downstream boundary. Changes are bounded to existing subsystems rather than a new runtime or storage schema.
- Independent Architecture Review required by the classification: **Yes**.
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Confirmed**.
- Approved requirements / intended behavior understood: SR-002 expressly removes AutoByteus's context-size gate for all current external runtime-catalog models in stopped Agent/Team/Org Settings, while retaining the verified non-decreasing AutoByteus rule. It does not guarantee provider acceptance of every long-history/model pair.
- Relevant existing behavior and evidence confirmed: the shared selection service gates both options and Save by capacity for every runtime; the Web picker further intersects server IDs with a separately fetched display catalog; Agent/Team/Org stopped owners validate before write; normal restore passes saved model and provider binding. Static code supports E02–E09 and AE-01–09. Screenshot alone does not establish live Claude catalog contents.
- Scope guardrail confirmed: in scope are existing stopped Settings, catalog/schema validation, configured linked scopes, accurate copy and normal resume/error; out of scope are runtime switching, active hot-swap, new discovery, Save-time compaction/reset, migration and universal provider success. Preserved boundary includes lifecycle, ownership, atomicity, identity/history and AutoByteus eligibility. Review authority is technical, not a renewed business-policy decision.
- Approved change, preserved behavior, and outside scope understood: **Yes**.
- Every prospective blocking Design Impact finding is traceable to approved REQ/AC/preserved IDs: **Yes**; no blocking finding was accepted.
- Remaining material ambiguity: none for the architecture decision; live smaller-window provider behavior is a downstream validation risk, not approval ambiguity.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User, stopped Agent/Team/Org picker | Pass | Pass — user opens exposed Settings; E01–05/E09 and inspected selection service/Web picker | Pass — DS-01/03, catalog IDs without external capacity gate, saved-ID fallback | Confirmed | None |
| BEH-002 | User Save / server contract | Pass | Pass — explicit Save through lifecycle owner; E02/E04/E06, inspected validation/commit paths | Pass — DS-02/04, fresh catalog/schema, atomic result | Confirmed | None |
| BEH-003 | User AutoByteus replacement | Pass | Pass — same stopped Settings; E02/E07 and inspected native capacity resolver | Pass — DS-01/02 preserve verified non-decrease and same-model exception | Confirmed | None |
| BEH-004 | System normal resume after Save | Pass | Pass — user's next message initiates restore; E08/E10 and inspected lifecycle handoff; smaller-window provider success not proven | Pass — DS-05 preserves binding/history and visible native rejection | Confirmed | Validate representative providers downstream; do not claim a universal pass |
| BEH-005 | User-facing Settings status/copy | Pass | Pass — exposed Agent/Team/Org Settings; E01/E05/E12 and inspected component/localization path | Pass — DS-03/06 distinguish external catalog vs native capacity; workspace warning remains separate | Confirmed | None |
| BEH-006 | Team/Org configured-scope edit | Pass | Pass — Team/Org operator uses existing Settings; E04/E09/E13 and inspected managers | Pass — DS-02/04, exact scope addresses, per-scope validation and one commit | Confirmed | None |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| User Claude Team Settings screenshot | Pass | Pass | Pass — sufficient as a current-surface observation, not catalog proof | Pass | Pass — evidence only | None |
| Completed `stopped-run-compatible-model` package | Pass | Pass | Pass — predecessor authority and limited live Codex evidence are identified | Pass | Pass — read-only, not this delta's approval | None |

Investigation notes contain the canonical supplement inventory; requirements and design link both relevant items. No behavior-defining supplement is missing.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for current task posture | Pass | Design explicitly calls this a behavior change under a new approved policy. | None |
| Root-cause classification is explicit and evidence-backed | Pass | Universal shared-service invariant and unused capacity-bearing option DTO are demonstrated by AE-01/02/04/05 and current source. | None |
| Refactor decision is explicit | Pass | Bounded refactor now: one runtime branch, native-only capacity evidence, removal of obsolete external readers/option numerics. | None |
| Refactor decision is reflected in concrete design | Pass | Interfaces, file/removal map, sequence and tests name the affected owners and obsolete code. | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-01 | Primary options, BEH-001/003 | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-02 | Primary Save, BEH-002/003/006 | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-03 | Return to picker/draft | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-04 | Return to canonical reconciliation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-05 | Primary normal resume, BEH-004 | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-06 | Bounded presentation copy | Pass | Pass | N/A — no additional facade | Pass | Pass | Pass | Pass |

The primary spines start at the actual Settings/next-message surface, cross the authoritative owner and reach returned options, persistence or provider outcome; they do not stop at the edited helper.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RunModelSelectionService` | Pass | Pass | Pass | Pass | Catalog, eligibility and schema stay behind one options/validate owner; no UI or lifecycle parallel policy. |
| Agent/Team/Org stopped lifecycle owners | Pass | Pass | Pass | Pass | GraphQL delegates to existing guarded, aggregate-commit owners; no direct metadata edit. |
| Existing Web config store | Pass | Pass | Pass | Pass | Components display/draft; canonical Save and reconciliation remain store/server-owned. |
| Restore/runtime adapters | Pass | Pass | Pass | Pass | Saved binding/provider continuation is not replaced by selection logic. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Selection owner → catalog/schema/native evidence | Pass | Pass | Pass | Pass | External capacity calls removed; native evidence serves selection only. |
| Stopped owners → selection validator and stores | Pass | Pass | Pass | Pass | Managers do not independently fetch capacity or implement a second rule. |
| Web forms → config store/options projection | Pass | Pass | Pass | Pass | No local capacity veto or direct Save from picker. |
| Restore adapter → provider | Pass | Pass | Pass | Pass | No fallback to a fresh conversation on rejection. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `listOptions` / `listOptionsMany` | Pass | Pass | Pass | Low | Pass |
| `validate` / `validateMany` | Pass | Pass | Pass | Low | Pass |
| Existing Agent/Team/Org Save commands | Pass | Pass | Pass | Low | Pass |
| GraphQL `RunModelOptionsObject` and matching Web query/types | Pass | Pass | Pass | Low | Pass |
| Settings copy/option projection | Pass | Pass | Pass | Low | Pass |

The removed numeric option fields have no identified in-repo production consumer (AE-05); this is a deliberate clean-cut GraphQL contract change, not a nullable/zero compatibility shim. An independently established external consumer would require re-evaluation, not speculation here.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Catalog, schema and request-local evidence | Pass | Pass | N/A | Pass | Existing LLM-management services reused. |
| Native verified capacity | Pass | Pass | Pass | Pass | Focused simplification replaces mixed external dispatch. |
| Stopped Save, persistence and restore | Pass | Pass | N/A | Pass | Existing lifecycle and provider owners retained. |
| Web localization/copy | Pass | Pass | N/A | Pass | Existing presentation boundary extended; no new eligibility authority. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| LLM management + runtime catalogs | Pass | Pass | Pass | Pass | One shared selection owner; native evidence is off-spine. |
| Run history, Team and Org execution | Pass | Pass | Pass | Pass | Existing stopped guards/writers, no second selection service. |
| GraphQL + Web config | Pass | Pass | Pass | Pass | Transport and presentation only; option DTO narrowed consistently. |
| Runtime restore adapters | Pass | Pass | Pass | Pass | Provider context behavior stays native. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime-specific eligibility | Pass | Pass | Pass | Pass | Centralized in existing selection service rather than extracted duplicate policies. |
| Run-model option result | Pass | Pass | Pass | Pass | Existing domain shape narrowed; GraphQL/Web are projections. |
| Native capacity proof | Pass | Pass | Pass | Pass | Focused LLM-management evidence file. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RunModelOptions`/GraphQL/Web mirror | Pass | Pass | Pass | Pass | Pass | Identifier list and unavailability reason only; no dummy capacity. |
| Native capacity evidence | Pass | Pass | Pass | N/A | Pass | Existing verified provenance retained only where policy needs it. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches Intended Owner/Boundary? | Responsibilities Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-model-selection-service.ts` and focused native-capacity file | Pass | Pass | Pass | Pass | Shared policy plus off-spine native evidence. |
| `domain/run-model-selection.ts`, GraphQL type, Web query/generated type | Pass | Pass | Pass | Pass | One reduced option contract across boundaries. |
| `RuntimeModelConfigFields.vue`, config forms and localization | Pass | Pass | Pass | Pass | Picker/status and bounded copy changes; no server-policy copy in client code. |
| Agent/Team/Org stopped owners and restore adapters | Pass | Pass | N/A | Pass | Retained, tested rather than assigned new policy. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `S/llm-management/services` and domain | Pass | Pass | Low | Pass | Existing selection owner and focused native evidence. |
| `S/runtime-management/*/client` capacity readers | Pass | Pass | Low | Pass | Obsolete selection-only readers removed, catalogs/restore retained. |
| `S/api/graphql/types`, `W/graphql`, `W/generated` | Pass | Pass | Low | Pass | Transport projection/codegen remains at boundary. |
| `W/components/*/config`, localization | Pass | Pass | Low | Pass | Existing UI folders fit the bounded change. |

## Removal / Decommission Completeness Verdict

| Item / Area | Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude/Codex/Antigravity external capacity paths | Pass | Pass | Pass | Pass | Delete readers/SDK method/imports after call-site audit; do not remove catalogs or provider adapters. |
| Mixed capacity domain/dispatch | Pass | Pass | Pass | Pass | Native-only positive verified resolver retained. |
| GraphQL/Web numeric option fields, queries, fixtures | Pass | Pass | Pass | Pass | Remove `currentContextTokens`/`contextTokens` and regenerate client types. |
| Universal capacity copy/docs | Pass | Pass | Pass | Pass | Runtime-specific accurate copy replaces obsolete claim. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Selection/API option shape | No | Pass | Pass | No fake numeric fields, dual validator or old client path proposed. |
| Persisted records | No | Pass | Pass | Existing current-schema reader remains; no version branch needed. |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Agent `run_metadata.json`; Team V2 and Org V1 trees | Directly Usable — No Migration | Pass | Pass | N/A | Pass | AE-07 samples contain existing runtime/model/config; inspected stopped writers and restore already use those fields. New eligibility changes allowed values, not shape or identity semantics. No bulk rewrite is justified. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Shared eligibility/native capacity | Pass | Pass — branch and request-local evidence updated together | Pass | Pass |
| GraphQL/Web DTO and generated types | Pass | Pass — schema/operations/codegen in one change | Pass | Pass |
| UI copy, tests and docs | Pass | Pass — validate rendered options/errors across scopes | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| External vs native eligibility | Yes | Pass | Pass | Pass | Concrete `[a,b,c]` external and 128k/64k/200k native case; Save repeats fresh check. |
| API capacity-field removal | Yes | Pass | Pass | Pass | Explicitly rejects `contextTokens: 0`, nullable fake values and dual contracts. |
| Provider continuation | No | N/A | N/A | Pass | Risk boundary stated without inventing a provider success guarantee. |

## Material Premise Validation (Only When Needed)

None. The provider-continuation risk is already established by approved SCN-006: a user selects a smaller external catalog model in stopped Settings, explicitly Saves, then sends the next message; current restore passes the saved model and provider binding to the external adapter, where native compaction or rejection may occur. E08/E10 support the path but not universal success. The separate Web catalog timing concern is within SCN-001–003's normal Settings load and AE-09; it remains a validation risk, not a new fallback mechanism or blocking finding.

## Unresolved Approved-Behavior Or Current-State Gaps

None. Representative live smaller-window continuation remains unvalidated and is explicitly assigned to implementation/API-E2E validation, not treated as proof of provider behavior.

## Review Decision

**Pass.** The behavior basis is confirmed, the high-risk shared selection/API change has one authoritative owner and an actionable clean-cut removal plan, and the preserved lifecycle/persisted-data boundaries are coherent.

## Findings

None.

## Classification

N/A — no failure finding.

## Recommended Recipient

Primary pass route: exact recipient returned by `get_handoff_rules` (expected `/implementation_engineer`); informational pass notification to the returned Solution Designer recipient only after primary handoff succeeds.

## Residual Risks

- Actual smaller/unknown-window Claude, Codex and Antigravity continuation is not established by the old equal-window Codex test or static adapters. Validate representative pairs; report provider rejection visibly and preserve local history/binding. Do not reinstate the platform capacity gate merely because a provider pair fails.
- The Web display/schema catalog is fetched separately from server options (AE-09). Implementation must keep server IDs authoritative and make a transient mismatch visible/retryable rather than silently treating it as capacity ineligibility; verify this on the normal Settings path.
- Removing GraphQL numeric fields is a deliberate contract break for this package. No in-repo production consumer was found; if implementation discovers an applicable external consumer contract, return the concrete conflict for design/requirement handling rather than adding dummy fields.

## Latest Authoritative Result

- Review Decision: **Pass**.
- Material-Premise Gate: **Pass**.
- Notes: ARCH-REV-001 reviews SR-003 design against SR-002-approved requirements; no implementation or provider test was performed by this reviewer.
