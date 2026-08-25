# Design Review Report — Application Execution Scope Boundary Hardening

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-scope-boundary-hardening/tickets/in-progress/application-execution-scope-boundary-hardening/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-scope-boundary-hardening/tickets/in-progress/application-execution-scope-boundary-hardening/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-scope-boundary-hardening/tickets/in-progress/application-execution-scope-boundary-hardening/design-spec.md`
- Supplemental Task Artifacts Reviewed: `application-execution-scope-ownership-and-spine-map.md`; `adjacent-application-agent-addressing-evaluation.md`.
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-scope-boundary-hardening/tickets/in-progress/application-execution-scope-boundary-hardening/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-scope-boundary-hardening/tickets/in-progress/application-execution-scope-boundary-hardening/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: initial architecture review of the user-authorized behavior-neutral application execution ownership refactor.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: `ARCH-REV-001`
- Current-State Evidence Basis: task HEAD `20c1e66d3b6eaf7ceafe33c189afeeff8516001c`; base `origin/personal@306de420ca8830478529b40bd6dfda6694b742a9`; current Studio/standalone builders, application platform builder/lifecycle, run/orchestration factories, Agent/Team services and managers, MCP session scope/manager, streaming, publication, architecture test, and focused durable tests.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`.
- Approved requirements / intended behavior understood: create one concrete execution owner at the existing `ApplicationPlatformRuntime` lifetime while preserving all Studio/standalone behavior and current multiplicity.
- Relevant existing behavior and evidence confirmed: the outer platform runtime and general supervisor are healthy; one application graph-local execution family is currently constructed as a mixed ten-member object, redistributed through orchestration, and referenced leaf-by-leaf by lifecycle and streaming.
- Scope guardrail confirmed: BEH-001–BEH-004; UC-001–UC-009; REQ-001–REQ-010; AC-001–AC-011. Per-mounted-application multiplicity and public addressing/schema cleanup are out of scope.
- Approved change, preserved behavior, and outside scope understood: the target is structural ownership hardening only; no product surface, runtime result, route, protocol, persistence, migration, or general-process behavior changes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes`.
- Remaining material ambiguity, if any: none in product intent. Two target-contract/inventory details remain incomplete at design level.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass — supported Studio boot constructs one platform runtime and a separate general supervisor | Pass — one scope at the current runtime lifetime is the right multiplicity | Confirmed | Retain exact contract and proof. |
| BEH-002 | Operational | Pass | Pass — supported standalone boot constructs one selected application runtime | Pass — the same scope boundary preserves host parity | Confirmed | Retain exact contract and proof. |
| BEH-003 | Contract | Pass | Pass — launch/input/stream/publication/task/reentry/close paths use one graph-local family | Needs Correction — spines and ownership are coherent, but central capability/build-input contracts and the implementation map are not exact enough to enforce the boundary | Needs Correction | Resolve AR-001 and AR-002. |
| BEH-004 | Contract | Pass | Pass — public general runs use `GeneralProcessRunSupervisor` and canonical definitions | Pass — general/application mutable authority remains non-identical | Confirmed | Retain independent proof. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `application-execution-scope-ownership-and-spine-map.md` | Pass | Pass | Fail | Pass | Pass | Complete the exact build-input, capability-signature, consumer, and construction/file inventory required by AR-001/AR-002. |
| `adjacent-application-agent-addressing-evaluation.md` | Pass | Pass | Pass | Pass | Pass | None; it is correctly evidence-only and outside this ticket. |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Requirements, investigation, and design identify a behavior-neutral architecture-health refactor. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Current broad factory/assembly results, lifecycle leaf dependencies, ambient getters, and stream fallback are source-backed. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | One scope per current platform runtime is selected; per-mounted-app scope and addressing changes are explicitly deferred. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | The scope owns real construction identity, admission, failure unwind, session lifetime, and ordered cleanup rather than acting as an aesthetic wrapper. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Studio boot | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Standalone boot | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Application launch/input | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Streaming return | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Publication return | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Shutdown | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 | Reentry | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 | Root-local task delegation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-009 | Construction unwind | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ApplicationPlatformRuntime` | Pass | Pass | Pass | Pass | Existing four projections remain unchanged. |
| `ApplicationExecutionScope` conceptual owner | Pass | Pass | Pass | Pass | Owns a real mutable identity/lifecycle family. |
| Scope capability boundary | Fail | Pass | Fail | Fail | Seven capability subjects are named, but their exact method/type contracts and consumer projections remain deferred to implementation. |
| `GeneralProcessRunSupervisor` | Pass | Pass | Pass | Pass | Remains mutually encapsulated from application execution. |
| `RootTeamRun` | Pass | Pass | Pass | Pass | Root-local task authority remains unchanged. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Host composition -> process/general/platform | Pass | Pass | Pass | Pass | Correct process construction direction. |
| Platform builder -> scope -> execution internals | Pass | Pass | Pass | Pass | Acyclic outer-stores -> scope -> orchestration order is coherent. |
| Orchestration/stream/lifecycle -> scope capability | Pass | Pass | Pass | Pass | No mixed-level access is allowed. |
| Scope -> injected shared infrastructure | Fail | Pass | Pass | Fail | The exact named input set and current-getter-to-owner mapping are not normative. |
| General vs application execution | Pass | Pass | Pass | Pass | Mutable owners remain non-identical. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `ApplicationAgentExecution` | Pass | Pass | Fail | Medium | Fail — exact operations and current types are not declared. |
| `ApplicationTeamExecution` | Pass | Pass | Fail | Medium | Fail — preset/configured/create/resolve/terminate/observe signatures are not declared. |
| `ApplicationExecutionStreaming` | Pass | Pass | Pass | Low | Pass at concept level; exact listener/unsubscribe contract still belongs in AR-001. |
| Artifact and memory capabilities | Pass | Pass | Fail | Low | Fail — current projection/memory method mapping is not exact. |
| Tool readiness and lifecycle capabilities | Pass | Pass | Fail | Medium | Fail — exact publisher/readiness/session-admission projection is not declared. |
| Scope construction input | Pass | Fail | Fail | High | Fail — no normative input type or exact scope-identity derivation is provided. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent/Team managers and services | Pass | Pass | N/A | Pass | Existing behavior remains. |
| Scoped MCP sessions | Pass | Pass | N/A | Pass | Scope owns only the application session scope/manager, not process route/catalog. |
| Publication, projection, memory, history, streaming | Pass | Pass | N/A | Pass | Existing implementations remain graph-local internals. |
| Concrete lifetime owner | Pass | Pass | Pass | Pass | Current procedural ownership justifies one real owner. |
| Shutdown coordinator | Pass | Pass | N/A | Pass | Retain and move as a bounded internal concern. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `application-platform/execution` | Pass | Pass | Pass | Pass | Cohesive new ownership folder. |
| application platform runtime | Pass | Pass | Pass | Pass | Remains outer owner. |
| application orchestration | Pass | Pass | Pass | Pass | Keeps binding/configuration/recovery and consumes capabilities. |
| process composition | Pass | Pass | Pass | Pass | Resolves shared owners once. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Scope capabilities and build input | Pass | Pass | Pass | Fail | Correct file/owner, but the promised exact structure is absent from the design. |
| Platform build input | Pass | Pass | Pass | Fail | Named injection direction is correct; exact required fields and owners are not enumerated. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Seven scope capability contracts | Fail | Pass | Pass | Pass | Fail | Subjects are separated, but no field/method shapes exist to verify semantic tightness. |
| Scope build input | Fail | Pass | Pass | N/A | Fail | Exact fields, scope identity, and shared-owner ports are not declared. |
| Existing public SDK/data | Pass | N/A | Pass | N/A | Pass | Correctly unchanged and deferred. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `application-execution-scope.ts` | Pass | Pass | Fail | Fail | Responsibility is clear, but its exact input/projections cannot yet be implemented without boundary design decisions. |
| `application-execution-scope-contracts.ts` | Pass | Pass | Fail | Fail | Central type authority is named but not specified. |
| `application-execution-shutdown-coordinator.ts` | Pass | Pass | Pass | Pass | Existing concern moves coherently. |
| Platform/orchestration/lifecycle/consumer files | Fail | Pass | Fail | Fail | Several rows use category labels instead of exact file paths and responsibilities. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/application-platform/execution/` | Pass | Pass | Low | Pass | Three cohesive files represent one deeper owner. |
| `src/application-platform/runtime/` after removals | Pass | Pass | Low | Pass | Retains outer assembly/lifecycle only. |
| application orchestration files | Pass | Pass | Medium | Pass | Existing subsystem remains; only dependency types change. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `create-application-run-services.ts` | Pass | Pass | Pass | Pass | Delete; do not wrap. |
| Old shutdown coordinator path | Pass | Pass | Pass | Pass | Rename/move without alias. |
| Stream singleton fallback | Pass | Pass | Pass | Pass | Remove import and branch. |
| Application assembly ambient getters | Fail | Pass | Fail | Fail | The getter families are evidenced but lack an exact source/input/consumer disposition table. |
| Raw execution leaves in lifecycle/orchestration result | Pass | Pass | Fail | Fail | Exact affected fields and file paths are not enumerated. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Old run-services factory | No target retention | Pass | Pass | No wrapper or alias. |
| Old shutdown path | No target retention | Pass | Pass | Move and update imports/tests. |
| Ambient/global execution paths | No target retention | Pass | Pass | Exact injection required. |
| Public addressing cleanup | No in-scope change | Pass | Pass | Separate ticket only. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Packages, definitions, launch overrides, bindings, histories, projections, journals and registered app data | Not Affected | Pass | Pass | N/A | Pass | No DTO/schema/store operation changes are authorized. |
| Adjacent addressing/runtimeKind persistence | Undetermined, separate ticket | Pass | Pass | N/A | Pass | Correctly excluded because a required physical column makes the future decision material. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Scope construction and focused tests | Pass | Pass | Pass | Pass |
| Outer stores -> scope -> orchestration assembly | Pass | Pass | Pass | Pass |
| Consumer conversion to exact capabilities | Fail | Pass | Pass | Fail |
| Named process dependency conversion | Fail | Pass | Fail | Fail |
| Lifecycle folding and old-path removal | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Lifetime/multiplicity | Yes | Pass | Pass | Pass | One scope per current runtime is unambiguous. |
| Spines and ownership | Yes | Pass | Pass | Pass | DS-001–DS-009 are strong. |
| Capability contracts | Yes | Fail | Pass | Fail | Names/operation summaries are not enough for this central boundary. |
| Scope/platform build input | Yes | Fail | Pass | Fail | No exact TypeScript shape or source-to-input mapping is present. |

## Material Premise Validation (Only When Needed)

### MP-ARCH-001-001 — Independently destroy/restart one mounted application's manager family while the platform runtime stays live

- Related approved requirement or established contract: scope guardrail and REQ-001/REQ-008.
- Relevant behavior ID(s): BEH-001, BEH-003.
- Initiating basis kind: `System`.
- Independent product-supported initiating trigger or applicable governing contract: none in the current product; current reload/reentry preserves the platform runtime and execution-family identity.
- Support evidence: Studio constructs one platform execution family; `ApplicationReentryService` reloads workers/bindings/events without reconstructing managers.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: no supported path exists.
- Lifecycle preconditions and material consequence at the claimed point: the proposed independent per-app teardown state is not produced.
- Reachability: `Not Reachable`.
- Review consequence / proportionate response: do not add per-mounted-app scopes, application-ID manager routing, or a scope registry. SR-001 correctly rejects them.

### MP-ARCH-001-002 — Platform construction fails after execution-owned session resources exist but before runtime publication

- Related approved requirement or established contract: REQ-005; AC-006; established composition-root partial-unwind contract.
- Relevant behavior ID(s): BEH-001–BEH-003.
- Initiating basis kind: `Contract`.
- Independent product-supported initiating trigger or applicable governing contract: supported Studio or standalone startup constructs required owners; a required constructor/input failure must not leak already-created execution resources or close shared process owners.
- Support evidence: current host composition uses ordered construction/unwind; target creation invokes the process MCP session factory before all outer platform construction completes.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Studio/standalone start -> build platform -> create session scope/manager and execution kernel -> later required construction throws -> scope/platform assembly unwind.
- Lifecycle preconditions and material consequence at the claimed point: runtime is unpublished and no run may exist, but session-scope state has been created; without unwind it survives failed startup.
- Reachability: `Reachable`.
- Review consequence / proportionate response: the owner-local staged unwind and assembly-only abort are proportionate; no generic lifecycle framework is justified.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Exact scope contracts and named dependency projection are missing | They are the central enforceable boundary of the approved refactor. | Resolve AR-001. | Open |
| Exact source/test transition inventory is incomplete | Clean removal and occurrence enforcement cannot be reviewed or implemented deterministically. | Resolve AR-002. | Open |

## Review Decision

`Fail — Design Impact`

The architectural direction is sound: one real scope at the current runtime lifetime, complete primary/return spines, correct outer/general/task ownership, acyclic construction, explicit lifecycle, no migration, and rejection of per-app routing all pass. The package is not implementation-ready because the new authoritative boundary is still described by capability names rather than exact contracts, and the large cross-cutting source/test transition remains category-based rather than exact.

## Findings

### AR-001 — The central execution-scope contracts and named construction inputs are not implementation-complete

- Type: `Design Impact`
- Finding ID: `AR-001`
- Severity: `High`
- Approved requirement / acceptance criterion / preserved behavior protected: BEH-003; REQ-002–REQ-004, REQ-007; AC-003, AC-005, AC-010.
- Scope status: `Within Approved Scope`
- Required update changes approved behavior: `No`
- Affected behavior / journey: every application Agent/Team launch, input, lifecycle observation, streaming subscription, artifact read, memory lookup, tool-readiness/session admission, and scope lifecycle path.
- Evidence: the design names seven capabilities and summarizes operations, but supplies neither normative TypeScript shapes nor an exact current-consumer-to-method mapping. It also names a required scope/platform build input without enumerating its fields, including the session `scopeIdentity` derivation and the current ambient process dependencies. Current source has materially different needs: launch calls Agent/Team creation; host input/termination resolves and terminates runs; lifecycle gateway observes runs; streaming needs exact active-run attachment; artifacts and memory use distinct read methods; readiness needs the publisher plus session readiness; lifecycle needs quiesce/close. Current application assembly also calls `getWorkspaceManager`, runtime/model catalog/availability, LLM provider, Codex client, and current-model identifier authorities, but SR-001 gives no exact source-owner-input-consumer disposition.
- Material-premise validation: none required; this finding evaluates the approved authoritative boundary against current supported production callers.
- Required update: define the exact `ApplicationExecutionScope` build input and each capability contract, using normative TypeScript or an equally exact signature table. Map every current consumer and operation to one capability; state how create/session admission is gated; define the exact scope identity input/derivation; enumerate every shared process/outer port and its owner; map each ambient getter to the host-resolved named input and final consumer; and declare the exact internal orchestration assembly result. Preserve private managers and prohibit generic bags/optional escape hatches.
- Why proportionate: these contracts are the refactor's authoritative boundary. Leaving them to implementation would require the implementer to make the core design decision and could recreate either a service bag or mixed-level bypass.
- Recommended recipient: `/solution_designer`

### AR-002 — The Add/Modify/Rename/Remove and durable-proof inventory is not exact for the cross-cutting boundary change

- Type: `Design Impact`
- Finding ID: `AR-002`
- Severity: `Medium`
- Approved requirement / acceptance criterion / preserved behavior protected: BEH-001–BEH-004; REQ-004, REQ-007, REQ-010; AC-005, AC-008–AC-011.
- Scope status: `Within Approved Scope`
- Required update changes approved behavior: `No`
- Affected behavior / journey: both host construction paths, all raw execution consumers, lifecycle, streaming, clean removal, architecture enforcement, and proportional regression proof.
- Evidence: the target map uses non-path rows such as “lifecycle contract/implementation,” “Studio/standalone roots,” “launch/host/lifecycle gateway service files,” and grouped test descriptions. Current source has exact affected callers in `build-studio-server.ts`, `start-standalone-application-host.ts`, `build-application-platform-runtime.ts`, `create-application-orchestration-services.ts`, `application-run-binding-launch-service.ts`, `application-orchestration-host-service.ts`, `application-bound-run-lifecycle-gateway.ts`, `application-agent-stream-runtime-source.ts`, lifecycle contracts/implementation, the old factory/coordinator, and current architecture/unit/integration tests. The package does not give each one an exact disposition or specify the revised architecture-guard construction/import obligations and occurrence authority.
- Material-premise validation: none required; this is current-tree actionability evidence.
- Required update: provide a closed exact path inventory for every Add, Modify, Rename/Move, Remove, and durable test/fixture change. For each path, state its post-refactor responsibility and which capability/input/removal it proves. Include exact old-factory/coordinator test replacement, both host callers, every raw execution consumer, every ambient getter occurrence, lifecycle fields, current AFB construction obligations, forbidden import/call rules, and the focused/realistic verification matrix.
- Why proportionate: the task is intentionally large and clean-cut. Exact disposition is necessary to avoid leaving a bypass, compatibility path, or stale architecture rule while keeping implementation bounded.
- Recommended recipient: `/solution_designer`

## Classification

`Design Impact`

## Recommended Recipient

`/solution_designer`

## Residual Risks

- After AR-001/AR-002, implementation must preserve every current backend-construction argument and graph-local identity; architecture guards should fail on missing/optional injections or new unclassified bypasses.
- The scope must remain a concrete owner, not a generic container, services dictionary, or renamed factory result.
- Latest-base refresh may add a new process dependency; it must be analyzed and added as a named input without reopening global access.
- The adjacent address/runtimeKind recommendation remains a separate versioned ticket with an undetermined physical persistence decision.
- No behavioral test result exists yet because this design worktree lacks installed dependencies; downstream execution remains mandatory.

## Latest Authoritative Result

- Review Decision: `Fail — Design Impact`
- Material-Premise Gate: `Pass`
- Notes: `ARCH-REV-001` accepts the ownership/lifetime/spine direction and opens `AR-001` and `AR-002` for exact contract and transition-inventory completion.
