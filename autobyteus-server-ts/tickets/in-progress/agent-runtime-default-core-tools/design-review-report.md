# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/in-progress/agent-runtime-default-core-tools/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/in-progress/agent-runtime-default-core-tools/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/in-progress/agent-runtime-default-core-tools/design-spec.md`
- Supplemental Task Artifacts Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/in-progress/agent-runtime-default-core-tools/runtime-tool-exposure-matrix.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/in-progress/agent-runtime-default-core-tools/system-prompt-file-operations-contract.md`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/in-progress/agent-runtime-default-core-tools/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-002` through `SR-010`, with `SR-010` as the current trigger
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/in-progress/agent-runtime-default-core-tools/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: `4`
- Trigger: `SR-010` rework of `ARCH-DI-003` after `ARCH-REV-003`.
- Prior Review Round Reviewed: `ARCH-REV-003` (Fail; `ARCH-DI-003`)
- Latest Authoritative Round: `ARCH-REV-004`
- Current-State Evidence Basis: Current native factory, neutral exposure helper, native resolver/registry, runtime manager and Claude/Codex bootstrap paths; current fixed Carpenter prompt sections and durable prompt documentation; existing file-tool schemas/docs; package behavior maps, approved supplements, and SR-010 rework evidence.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: The package has explicit user approval for the native AutoByteus runtime baseline (`run_bash`, `read_file`, `edit_file`) across standalone and native team-member/task-agent runs, additive existing team communication/delegation, external-runtime isolation, persisted `AgentDefinition.toolNames` immutability, and the concise cross-runtime file-operation prompt contract.
- Relevant existing behavior and evidence confirmed: Native create/restore converges on the factory `buildAgentConfig` path; the shared exposure helper is also used by Claude/Codex; native registry initialization is supplied by `AgentFactory.registerTools()`; fixed prompt source and durable prompt documentation currently share the old wording and are both explicitly mapped for implementation alignment.
- Approved change, preserved behavior, and outside scope understood: The native wrapper, fixed prompt wording, tests, and mapped durable documentation updates are in scope. Tool implementations, schemas, registry registration, safety/approval/path authorization, external provider projections, persisted definitions, and migration remain unchanged or outside scope.
- Remaining material ambiguity, if any: None.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `BE-001` | System | Pass | Pass | Pass | Confirmed | Native standalone start follows DS-001 through the native factory wrapper and resolver. |
| `BE-002` | System | Pass | Pass | Pass | Confirmed | Native team-member/task-agent start follows DS-002; team automatic names remain additive. |
| `BE-003` | Contract | Pass | Pass | Pass | Confirmed | DS-005 preserves Claude/Codex neutral-helper and provider/MCP projection behavior without the native wrapper. |
| `BE-004` | System | Pass | Pass | Pass | Confirmed | Existing `registerTools()` initialization contract is explicitly traced through native materialization. |
| `BE-005` | Contract | Pass | Pass | Pass | Confirmed | DS-006 reaches all fixed-prompt consumers, and the durable prompt source is now explicitly mapped for alignment. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? (`Pass`/`Fail`) | Linked To Relevant Core Artifacts? (`Pass`/`Fail`) | Internally Complete? (`Pass`/`Fail`) | Consistent With Related Core Artifacts? (`Pass`/`Fail`) | Status And Approval Applicability Are Clear? (`Pass`/`Fail`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `runtime-tool-exposure-matrix.md` | Pass | Pass | Pass | Pass | Pass | None. |
| `system-prompt-file-operations-contract.md` | Pass | Pass | Pass | Pass | Pass | None. |

Both supplements remain explicitly user-approved and retain architecture review as the implementation gate. Their requirements links, design links, and availability/schema boundaries are coherent.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | `requirements.md` and `investigation-notes.md` classify the work as a Behavior Change with current-state evidence. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | `Missing Invariant` is supported by the native path omitting the baseline while the shared helper serves external runtimes; prompt refinement is bounded by an existing prompt owner. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | The package selects a thin native wrapper and fixed-section update; it rejects a shared runtime-kind switch and registry/tool refactor. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | DS-001 through DS-006, ownership maps, complete file inventory, and change sequence support the focused design. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` native standalone | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-002` native team member/task-agent | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-003` native exposure/materialization | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-004` native return/event lifecycle | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| `DS-005` external provider isolation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-006` fixed prompt support flow | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

The spines span supported run-start/restore triggers through authoritative owners and meaningful native, external, or prompt outcomes. DS-005 and DS-006 make the non-native/default-policy boundaries independently reviewable.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRunManager` | Pass | Pass | Pass | Pass | Selects runtime-specific factories and does not own tool policy. |
| `AutoByteusAgentRunBackendFactory.buildAgentConfig` | Pass | Pass | Pass | Pass | One native create/restore configuration boundary. |
| `AutoByteusRuntimeToolExposure` | Pass | Pass | Pass | Pass | Owns only the native baseline and delegates neutral mechanics. |
| `buildRuntimeAgentToolExposure` | Pass | Pass | Pass | Pass | Existing neutral normalization, deduplication, and team-pair owner. |
| `resolveAutoByteusAgentTools` / native registry | Pass | Pass | Pass | Pass | Existing materialization and initialization contract are reused. |
| Claude/Codex bootstrap and provider/MCP projection | Pass | Pass | Pass | Pass | External path remains separate and forbids native-wrapper imports/calls. |
| `composeCarpenterPrompt` and fixed sections | Pass | Pass | Pass | Pass | Owns static guidance only; schemas and runtime safety remain authoritative. |
| Durable prompt documentation | Pass | Pass | Pass | Pass | Exact durable source and delivery-doc ownership are now explicit. |
| Tool schema documentation | Pass | Pass | Pass | Pass | Verification-only disposition preserves schema authority without duplication. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Native factory -> native wrapper -> neutral builder -> native resolver | Pass | Pass | Pass | Pass | Native policy is scoped before neutral mechanics and materialization. |
| Claude/Codex bootstrap -> neutral builder -> provider/MCP projection | Pass | Pass | Pass | Pass | DS-005 explicitly excludes the native wrapper. |
| Prompt composer -> fixed sections -> provider/native instructions | Pass | Pass | Pass | Pass | Prompt does not inspect exposure or bypass safety. |
| Prompt documentation -> fixed prompt source | Pass | Pass | Pass | Pass | Documentation mirrors the source sections; it owns no independent policy. |
| Runtime/persistence callers -> `AgentDefinition.toolNames` | Pass | Pass | Pass | Pass | Definitions are read-only input; effective defaults are fresh runtime data. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `resolveAutoByteusRuntimeToolExposure(agentDefinition, memberTeamContext)` | Pass | Pass | Pass | Low | Pass |
| `buildRuntimeAgentToolExposure(toolNames, memberTeamContext)` | Pass | Pass | Pass | Low | Pass |
| `resolveAutoByteusAgentTools(input)` | Pass | Pass | Pass | Low | Pass |
| `AutoByteusAgentRunBackendFactory.buildAgentConfig(options, runId)` | Pass | Pass | Pass | Low | Pass |
| `composeCarpenterPrompt(input)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Native baseline composition | Pass | Pass | Pass | Pass | Native policy wrapper prevents leakage with minimal new support. |
| Normalization, deduplication, and team automatic names | Pass | Pass | N/A | Pass | Existing shared helper remains unchanged. |
| Native materialization and registry readiness | Pass | Pass | N/A | Pass | Existing resolver/registry/`registerTools()` path is reused. |
| External provider projection | Pass | Pass | N/A | Pass | Existing Claude/Codex provider/MCP owners remain authoritative. |
| Prompt composition and tool-schema contracts | Pass | Pass | N/A | Pass | Existing prompt owner and schemas are extended/aligned, not duplicated. |
| Durable documentation | Pass | Pass | N/A | Pass | Exact prompt doc is mapped for edit; schema doc is verification-only. |
| Persisted definitions and migration | Pass | Pass | N/A | Pass | No schema or write-path change is proposed. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared exposure | Pass | Pass | Pass | Pass | Neutral mechanics and existing team names remain shared. |
| AutoByteus backend | Pass | Pass | Pass | Pass | Owns native baseline and native config assembly. |
| Native tools/registry | Pass | Pass | Pass | Pass | Definitions, schemas, and registration remain authoritative. |
| Team execution | Pass | Pass | Pass | Pass | Supplies lifecycle/context only. |
| Claude/Codex providers | Pass | Pass | Pass | Pass | Own external exposure without native defaults. |
| Prompt subsystem | Pass | Pass | Pass | Pass | Owns fixed wording and assembly, not exposure or safety. |
| Runtime documentation | Pass | Pass | Pass | Pass | Prompt documentation and runtime-exposure documentation owners are explicit. |
| Tool-contract documentation | Pass | Pass | Pass | Pass | Verification-only role preserves the schema authority. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Normalized runtime exposure | Pass | Pass | Pass | Pass | Existing neutral structure is reused without a runtime-kind switch. |
| Native mandatory tuple | Pass | Pass | Pass | Pass | One exact tuple under the native backend is proportionate. |
| Fixed prompt sections | Pass | Pass | Pass | Pass | Existing paired sections remain the single fixed prompt structure. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RuntimeAgentToolExposure` | Pass | Pass | Pass | N/A | Pass | Effective runtime exposure remains distinct from persisted configuration. |
| `AUTOBYTEUS_DEFAULT_TOOL_NAMES` | Pass | Pass | Pass | N/A | Pass | Exact three-name native invariant. |
| `AgentDefinition.toolNames` | Pass | Pass | Pass | N/A | Pass | Configured names remain immutable and separate from effective names. |
| Fixed prompt guidance vs tool schemas | Pass | Pass | Pass | Pass | Pass | Prompt is workflow-level; schemas retain parameter/safety semantics. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-runtime-tool-exposure.ts` | Pass | Pass | Pass | Pass | Native tuple and wrapper only. |
| `autobyteus-agent-run-backend-factory.ts` | Pass | Pass | Pass | Pass | Calls the wrapper in the shared create/restore path. |
| Native resolver/registry files | Pass | Pass | Pass | Pass | Existing materialization remains owned there. |
| Claude/Codex bootstrap files | Pass | Pass | Pass | Pass | Continue neutral-helper/provider projection path. |
| `carpenter-prompt-sections.ts` / composer | Pass | Pass | Pass | Pass | Fixed wording and assembly only. |
| Native/shared/prompt tests | Pass | Pass | Pass | Pass | Coverage mirrors policy and prompt contracts. |
| `docs/modules/agent_tools.md` | Pass | Pass | N/A | Pass | Runtime exposure documentation is explicitly mapped. |
| `docs/modules/prompt_engineering.md` | Pass | Pass | N/A | Pass | Exact required edit, owner, and replacement scope are explicit. |
| `autobyteus-ts/docs/tool_schema_and_configuration.md` | Pass | Pass | N/A | Pass | Verification-only disposition is explicit and proportionate. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/agent-execution/backends/autobyteus` | Pass | Pass | Low | Pass | Native backend is the natural policy owner. |
| `src/agent-execution/prompt` | Pass | Pass | Low | Pass | Existing prompt subsystem owns fixed guidance. |
| Native/shared/prompt unit-test folders | Pass | Pass | Low | Pass | Test projections follow production ownership. |
| `docs/modules` | Pass | Pass | Low | Pass | Runtime-exposure and prompt documentation remain off-spine concerns with explicit owners. |
| `autobyteus-ts/docs` | Pass | Pass | Low | Pass | Schema documentation remains a verification-only authority. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Native omission of the three foundation tools | Pass | Pass | Pass | Pass | Replaced by the native wrapper; no opt-out. |
| Existing overlapping fixed prompt wording | Pass | Pass | Pass | Pass | Replaced in source and mapped durable prompt documentation. |
| Existing tool classes, registry entries, and team tools | Pass | N/A | Pass | Pass | Remain authoritative and are not removed. |
| Shared-helper external behavior | Pass | Pass | Pass | Pass | Preserved; no compatibility path is needed. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Native exposure omission | No | Pass | Pass | No opt-out or old/new branch is proposed. |
| Persisted `AgentDefinition.toolNames` | No | Pass | Pass | Stored configuration is preserved without compatibility fields. |
| External runtime exposure | No | Pass | Pass | Neutral behavior remains unchanged. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentDefinition.toolNames` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | The model accepts empty/omitted names; the wrapper creates a fresh effective iterable and never writes the definition. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Native exposure policy and factory call | Pass | Pass | Pass | Pass |
| Native policy/materialization coverage | Pass | Pass | Pass | Pass |
| Prompt source/tests and schema-led alignment | Pass | Pass | Pass | Pass |
| Durable prompt/runtime documentation | Pass | Pass | Pass | Pass |

The implementation sequence is realistic, explicit about the documentation edit and schema verification disposition, and requires no migration or compatibility seam.

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Native-only composition | Yes | Pass | Pass | Pass | Native factory -> wrapper -> neutral builder -> native resolver is contrasted with external-wrapper leakage. |
| Persisted configuration and deduplication | Yes | Pass | Pass | Pass | Fresh effective list and no mutation are concrete. |
| Team filtering | Yes | Pass | Pass | Pass | Defaults precede existing mixed filtering and team names remain additive. |
| External isolation | Yes | Pass | Pass | Pass | DS-005 and the forbidden dependency are explicit. |
| File-operation recovery | Yes | Pass | Pass | Pass | Read current region -> edit -> reread/rebuild after failure -> Bash fallback -> verify. |
| Durable documentation alignment | Yes | Pass | Pass | Pass | The exact prompt document edit and schema-document verification-only disposition are now explicit. |

## Material Premise Validation (Only When Needed)

None. The review is grounded in approved behavior, observed current source/documentation paths, and explicit design ownership. No finding or required mechanism depends on an unsupported material production scenario.

## Unresolved Approved-Behavior Or Current-State Gaps

None. `ARCH-DI-003` is resolved and verified against the updated design mappings, ownership boundaries, change sequence, investigation disposition, and solution revision record.

## Review Decision

`Pass` — the approved behavior basis is confirmed, prior findings remain resolved, the durable documentation inventory is complete, and the design is ready for implementation.

## Findings

None.

## Classification

No unresolved classification. `ARCH-DI-003` (`Design Impact`) is resolved by `SR-010`; `ARCH-REQ-001`, `ARCH-DI-001`, and `ARCH-DI-002` remain resolved from `ARCH-REV-002`.

## Recommended Recipient

`implementation_engineer` — proceed with the cumulative reviewed solution package. API/E2E coverage investigation remains downstream after implementation and code review.

## Residual Risks

- Implementation must update `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/docs/modules/prompt_engineering.md` as explicitly mapped, while keeping `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-ts/docs/tool_schema_and_configuration.md` verification-only unless drift is observed.
- The worktree lacks dependencies, so focused tests remain a downstream setup and validation item.
- Implementation must preserve the single native `buildAgentConfig` create/restore path, mixed-team filtering after default composition, registry-backed materialization, external neutral-helper isolation, and prompt availability/schema boundaries.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass`
- Notes: `ARCH-DI-003` is resolved and verified. The native-only wrapper boundary, external DS-005 isolation spine, BE-004 registry contract, DS-006 prompt contract, complete documentation inventory, no-migration decision, ownership, interfaces, reuse, and change sequence are implementation-ready.
