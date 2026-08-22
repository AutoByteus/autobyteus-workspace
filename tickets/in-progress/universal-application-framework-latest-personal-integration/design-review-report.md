# Design Review Report — Universal Application Framework Latest-Personal Integration

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/design-spec.md`
- Supplemental Task Artifacts Reviewed:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/integration-strategy-analysis.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/merge-attempt.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/merge-conflict-inventory.txt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/branch-overlap-inventory.txt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/integration-path-inventory.txt`
  - Finalized feature requirements, design, design-review, source-review, API/E2E, handoff, and delivery records under `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/done/universal-application-framework-proposal-analysis/`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Initial review of the proposed semantic integration onto latest Personal.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: `ARCH-REV-001`
- Current-State Evidence Basis: exact refs `origin/personal@8ef282ba77705180d985e7000d801f0e0068cdc1` and `origin/codex/universal-application-framework-proposal-analysis@a5ffd289aa58293574e44dfa8b38ed8b1978ffd0`; merge base `acb8985930ccce49b632cdca22b92f5b237e35bf`; the retained trial-merge/overlap inventories; independent reads of current Personal startup, activation/provisioning, team, launch-configuration, SDK-contract, and persistence sources and the corresponding finalized-feature sources.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: preserve latest Personal as the current runtime/data authority while integrating the finalized same-package Studio/standalone foundation once and retaining its scoped application behavior.
- Relevant existing behavior and evidence confirmed: the measured merge surface is reproducible from the refs; current Personal owns the newer startup, activation candidate, rooted team identity, provider, contract-v6, and persisted launch-profile behavior; the finalized feature owns the explicit dual-host/application-platform/devkit/scoped-publication behavior.
- Scope guardrail confirmed: UC-001–UC-007, stated exclusions, BEH-001–BEH-006, and the review-authority rule are clear.
- Approved change, preserved behavior, and outside scope understood: no new product policy, compatibility layer, migration, external standalone gateway, or broad domain redesign is introduced by these findings.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes`
- Remaining material ambiguity: none in approved intent; the blockers are target-design completeness issues.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Pass | Pass — refs, ancestry, trial merge, and branch isolation are evidenced | Pass — single history-preserving merge is coherent | Confirmed | Retain exact inputs and merge-parent proof. |
| BEH-002 | User | Pass | Pass — current and feature application trees/scripts were compared | Pass | Confirmed | Retain native commands and deterministic package proof. |
| BEH-003 | System | Pass | Pass — current candidate activation, RootTeamRun, and finalized scoped publication are source-backed | Fail — the activation/provisioning construction and cleanup transition is not yet specified at current-owner precision | Needs Correction | Resolve AR-002. |
| BEH-004 | User/Contract | Pass | Pass — current `memberAddress` launch rows and feature sparse launch stages use the same physical table but different semantic shapes | Fail — direct-use persisted-row semantics and the single store owner are not yet defined | Needs Correction | Resolve AR-003. |
| BEH-005 | Operational | Pass | Pass — conflict and overlap inventories are evidenced | Pass for strategy; affected exact inventory rows remain part of AR-002/AR-003 | Confirmed | Correct the target inventory while preserving the one-merge strategy. |
| BEH-006 | Contract | Pass | Pass — old branch results are correctly treated only as characterization | Pass | Confirmed | Execute the integrated matrix downstream. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `integration-strategy-analysis.md` | Pass | Pass | Fail | Pass | Pass | Add exact current startup allocation, activation contracts, and persisted launch-row transition. |
| `merge-attempt.log` | Pass | Pass | Pass | Pass | Pass | None. |
| `merge-conflict-inventory.txt` | Pass | Pass | Pass | Pass | Pass | None. |
| `branch-overlap-inventory.txt` | Pass | Pass | Pass | Pass | Pass | None. |
| `integration-path-inventory.txt` | Pass | Pass | Fail | Fail | Pass | Add target-critical Personal-only paths and remove contradictory add/retain dispositions for superseded owners. |
| Finalized-feature done package | Pass | Pass | Pass | Pass | Pass — characterization baseline | Preserve as evidence; do not copy obsolete owners. |

`integration-path-inventory.txt` is a useful merge-delta inventory, but it is not yet a complete target transition inventory. For example, current `agent-run-activation-candidate.ts`, `standalone-agent-run-activation-service.ts`, `agent-run-provisioning-service.ts`, and `application-execution-resource-configuration-store.ts` are absent even though the target design changes or depends materially on their contracts. The two feature-era mixed-member registry files are also simultaneously categorized as feature-only additions and changed-both paths even though the design says not to resurrect them.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The task is correctly classified as a large integration/refactor with a boundary/ownership root cause. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | The code and merge evidence confirm intersecting current-runtime and finalized-feature authorities. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | The design chooses one bounded activation construction adaptation. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Fail | The proposed owner is justified, but the current activation/provisioning state machine, process startup allocation, and persisted launch reader are not concrete enough to implement without making new design decisions. | Resolve AR-001–AR-003. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Semantic merge | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002–DS-003 | Studio and standalone startup | Pass | Fail | Fail | Pass | Fail | Pass | Fail |
| DS-004 | Current application execution | Pass | Fail | Pass | Pass | Fail | Pass | Fail |
| DS-005 | Tool/message/artifact return | Pass | Pass | Pass | Pass | Pass | Pass | Pass, contingent on AR-002's exact active-run owner |
| DS-006 | Activation and cleanup | Pass | Fail | Pass | Pass | Fail | Pass | Fail |
| DS-007 | Integrated proof | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Studio/standalone process startup | Pass | Fail | Fail | Fail | Current process gates and the feature lifecycle overlap without an exact allocation/order/unwind map. |
| `ApplicationPlatformRuntime` four projections | Pass | Pass | Pass | Pass | The established four-field boundary is preserved. |
| Current agent activation and application-scoped run construction | Fail | Fail | Fail | Fail | The target registry API/state ownership and affected current services are not defined. |
| Launch configuration / persisted override | Pass | Fail | Fail | Fail | One physical table currently has two divergent semantic readers and two candidate store owners. |
| Devkit/canonical-source boundary | Pass | Pass | Pass | Pass | Remove/regenerate policy is directionally sound. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Host builders -> application runtime projections | Pass | Pass | Pass | Pass | Separate roots and four projections remain correct. |
| Application activation -> publisher -> scoped sessions -> providers -> manager | Fail | Pass | Pass | Fail | Direction is sound, but exact constructor/factory obligations and state/result contracts are absent. |
| Current team graph -> graph-local run/context/session dependencies | Fail | Pass | Pass | Fail | Current optional-default call sites are not closed in the target inventory. |
| Launch service -> one persisted override store | Fail | Pass | Pass | Fail | Store selection and row contract are unresolved. |
| Application source -> SDK/devkit | Pass | Pass | Pass | Pass | No host-internal dependency is proposed. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `buildStudioServer` / `buildStandaloneApplicationServer` | Pass | Pass | Pass | Low | Pass |
| `ApplicationPlatformRuntime` projections | Pass | Pass | Pass | Low | Pass |
| proposed `AgentRunActivationRegistry` | Pass | Fail | Fail | Medium | Fail |
| current `AgentRunActivationCandidate` prepare/publish/abort path | Pass | Pass | Pass | Low | Fail — omitted from target transition |
| launch view/evaluate/preview/reset | Pass | Pass | Pass | Low | Fail — stored row semantics are not exact |
| rooted team member identity | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Semantic Git integration | Pass | Pass | N/A | Pass | One merge is the most auditable approach. |
| Current process startup/migrations | Pass | Pass | N/A | Fail | Reuse decision is correct but exact ownership/order is missing. |
| Current activation/provisioning | Pass | Pass | Pass | Fail | Registry extraction is plausible but under-specified. |
| Current rooted team identity | Pass | Pass | N/A | Pass | `memberAddress`, `agentRunId`, and `teamRunId` are correct. |
| Feature launch baseline/override/readiness | Pass | Pass | N/A | Fail | Current persisted row compatibility is not demonstrated. |
| Devkit/package generation | Pass | Pass | N/A | Pass | Clean source plus deterministic generation is appropriate. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server compositions | Fail | Pass | Pass | Fail | Process prerequisite and post-listen responsibilities need exact allocation. |
| Application platform | Pass | Pass | Pass | Pass | Four projections and shared lifecycle remain appropriate. |
| Agent execution | Fail | Pass | Pass | Fail | Exact current state-machine distribution is missing. |
| Team execution | Fail | Pass | Pass | Fail | Required explicit dependency propagation is not enumerated against current owners. |
| Agent Tools/publication | Pass | Pass | Pass | Pass | Scoped publication direction is retained. |
| Launch configuration/storage | Fail | Pass | Pass | Fail | One owner and one direct-use row meaning are not yet fixed. |
| Devkit/application packages | Pass | Pass | Pass | Pass | Allocation is coherent. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Activation transition state/results | Pass | Pass | Fail | Fail | Specify pending/active/quarantined/resource state and manager consumption exactly. |
| Runtime projection contracts | Pass | Pass | Pass | Pass | Retain. |
| Launch baseline/override/effective stages | Pass | Pass | Pass | Fail | Runtime stages are clear; persisted input representation is not. |
| Rooted team address | Pass | Pass | Pass | Pass | Current Personal owner is correct. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `memberAddress` / `agentRunId` / `teamRunId` | Pass | Pass | Pass | Pass | Pass | Current identity wins cleanly. |
| activation claim/candidate/active/resource records | Fail | Fail | Fail | Fail | Fail | Target types and ownership split are not defined. |
| `launch_profile_json` row | Fail | Fail | Fail | Fail | Fail | Current full-profile and feature sparse-override meanings must be reconciled into one exact direct-use shape. |
| runtime projection bundle | Pass | Pass | Pass | Pass | Pass | No service bag is exposed. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `server-runtime.ts` and the two host starters/builders | Fail | Pass | Fail | Fail | Current startup phases are not allocated to exact target files. |
| `agent-run-manager.ts` / proposed registry | Fail | Pass | Fail | Fail | Current candidate/provisioning collaborators are absent from the mapping. |
| current mixed-team managers/handles | Pass | Pass | Fail | Fail | Exact required graph-local constructor inputs and obsolete-registry removals are unresolved. |
| launch configuration service/store files | Fail | Pass | Fail | Fail | Both candidate store paths are not dispositioned. |
| devkit/application source | Pass | Pass | Pass | Pass | Mapping is adequate. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/compositions/` | Pass | Pass | Low | Pass | Explicit roots remain appropriate. |
| `src/application-platform/runtime/` | Pass | Pass | Low | Pass | Shared application boundary is coherent. |
| `src/agent-execution/runtime/` proposed registry | Pass | Pass | Medium | Fail | Placement is good; responsibility/interface remains incomplete. |
| `src/application-platform/launch-configuration/` | Pass | Pass | Low | Pass | Policy location is correct. |
| `src/application-orchestration/stores/` | Fail | Pass | High | Fail | Two differently named stores over one table are not dispositioned. |
| app canonical source / devkit | Pass | Pass | Low | Pass | Clear. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| custom builders and editable mirrors | Pass | Pass | Pass | Pass | Removal/regeneration direction is clear. |
| feature-era active/member registries | Pass | Pass | Fail | Fail | Exact inventory still categorizes two obsolete member registries as additions/overlaps. |
| current launch configuration service/store replaced by feature launch owner | Fail | Pass | Fail | Fail | The service is named for removal, but its Personal-only store is absent. |
| broad feature-era engine/compatibility seams | Pass | Pass | Pass | Pass | Clean removal remains explicit. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Run/team internal owners | No intended | Fail | Fail | Inventory ambiguity can retain obsolete registries beside current owners. |
| Launch persistence | No intended | Fail | Fail | Two runtime stores/readers would create a dual path unless one exact owner is selected. |
| Application package/source output | No | Pass | Pass | Clean canonical source and regeneration are explicit. |
| Versioned internal aliases | No | Pass | Pass | Current numeric wire values with clean internal names are stated. |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Personal operational DB, migrations, run/history state | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Current owners remain authoritative. |
| Application binding/event/artifact state | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Current contract identities are selected and feature outputs will be regenerated. |
| `__autobyteus_resource_configurations.launch_profile_json` | Directly Usable — No Migration | Fail | Unclear | N/A | Fail | Personal currently reads `ApplicationConfigured*` with rooted addresses; the feature reads `ApplicationLaunchOverride` with route keys. The target reader/writer and exact compatible shape are not specified. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| One semantic merge and derived regeneration | Pass | Pass | Pass | Pass |
| Process startup/lifecycle integration | Fail | Fail | Fail | Fail |
| Activation/session/publication adaptation | Fail | Pass | Fail | Fail |
| Launch configuration/storage transition | Fail | Pass | Fail | Fail |
| Verification and delivery refresh | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| High-level dual-host construction | Yes | Pass | Pass | Pass | Useful. |
| Current activation candidate lifecycle | Yes | Fail | Pass | Fail | Show exact claim/prepare/quarantine/publish/abort/remove results and callers. |
| Current startup allocation | Yes | Fail | N/A | Fail | An ordered host-applicability/failure/unwind table is needed. |
| Persisted launch row direct use | Yes | Fail | Pass | Fail | Include representative current agent/team rows through the target reader. |
| Generated-output handling | Yes | Pass | Pass | Pass | Delete/regenerate shape is clear. |

## Material Premise Validation

None. The findings rely on approved BEH-003/BEH-004 startup, launch, execution, recovery, and persistence paths already established by the requirements and independently confirmed in current production source; no speculative initiating scenario is used.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Current process startup and shutdown allocation | Skipping, duplicating, or reordering current Personal gates changes REQ-004/AC-009 behavior in either supported host. | Resolve AR-001. | Open |
| Current activation/provisioning state-machine adaptation | The main application run path can otherwise fall back globally or regress current candidate/quarantine/cleanup behavior. | Resolve AR-002. | Open |
| Direct-use launch override persistence | Existing Personal rows can otherwise be misread, rewritten, hidden, or owned by two stores. | Resolve AR-003. | Open |

## Review Decision

`Fail` — the single-merge strategy and authority direction are sound, but the design is not yet implementation-ready at three production-critical intersections.

## Findings

### AR-001 — Current process/platform lifecycle allocation is not exact

- Type: `Design Impact`
- Severity: High
- Approved authority protected: BEH-002, BEH-003; REQ-003–REQ-005; AC-003, AC-008, AC-009, AC-011
- Scope status: `Within Approved Scope`
- Required update changes approved behavior: `No`
- Affected approved journey: Studio start, standalone `dev/start`, application readiness/recovery, and ordered shutdown.
- Evidence: latest Personal `src/server-runtime.ts` has a concrete ordered lifecycle covering logging, core migration, protected database paths, Prisma, token-usage schema readiness, vault, app-data migrations, TeamRun V1 catalog rebuild, readable-provider gating, built-ins, route construction/listen, channel/gateway runtimes, internal URL seeding, messaging restore, temp workspace, application recovery, and background work. The finalized feature splits overlapping tasks across `server-runtime.ts`, `start-standalone-application-host.ts`, `build-studio-server.ts`, and `ApplicationPlatformLifecycle`. DS-002/DS-003 currently summarize these as “Personal startup/migration/provider gates” without assigning every phase, await/background policy, failure class, unwind, and stop owner for each host.
- Material-premise validation: N/A — both host starts are approved supported triggers.
- Required update: add an exact latest-Personal-to-target lifecycle table and ordered Studio/standalone spines. For every current phase, name the target owner/file, host applicability, exact relative order, awaited/background behavior, failure outcome, startup unwind, and stop responsibility. Remove duplicate ownership explicitly and map the target file inventory, including token-usage readiness, TeamRun catalog rebuild, provider migration, process transports, and application recovery.
- Why proportionate: this records existing required behavior at the exact intersection being merged; it adds no new lifecycle machinery.
- Recommended recipient: `/solution_designer`

### AR-002 — The proposed activation registry does not yet preserve the current activation/provisioning contract concretely

- Type: `Design Impact`
- Severity: High
- Approved authority protected: BEH-003; REQ-004–REQ-006; AC-005, AC-007, AC-008, AC-010
- Scope status: `Within Approved Scope`
- Required update changes approved behavior: `No`
- Affected approved journey: application agent/team create, restore, publication, handoff/artifact use, termination, inactive discovery, startup recovery, and stop.
- Evidence: latest Personal distributes the supported lifecycle across `AgentRunManager`, `AgentRunActivationCandidate`, `StandaloneAgentRunActivationService`, `AgentRunProvisioningService`, current mixed-team handles/registries, and token-usage readiness. It claims before backend await, keeps candidates private, commits metadata before synchronous publication, validates provider identity, quarantines indeterminate cleanup/commit, and releases sidecars/sessions. The finalized feature's `ActiveAgentRunRegistry` instead owns an older active-map/resource shape. The proposed `AgentRunActivationRegistry` is justified directionally, but no exact API/result/state table shows which current responsibilities move, which remain with the manager/activation service, or how graph-local resources/session revocation are supplied. Several critical current files are absent from `integration-path-inventory.txt`, while feature-era mixed-member registry files are still categorized for addition despite the removal policy.
- Material-premise validation: N/A — these states are exercised by the supported current create/restore/terminate contracts and their durable tests.
- Required update: define the target construction DAG and exact interfaces for claim, prepare attachment, candidate publication, abort, inactive discovery/replacement, identity-checked removal, resource release, quarantine, and stop-all. Map each current caller and file to Retain/Modify/Remove/Rename; enumerate every required application-scoped constructor/factory input and the exact general-process exemptions; include current provisioning/activation/team-context paths and architecture omission tests. Resolve the old member-registry inventory contradiction.
- Why proportionate: one concrete state owner can remain the solution, but its boundary must be precise enough to preserve current behavior without reviving old owners or selecting a global default.
- Recommended recipient: `/solution_designer`

### AR-003 — `Directly Usable — No Migration` is not proven for persisted launch overrides and one store owner is not selected

- Type: `Design Impact`
- Severity: High
- Approved authority protected: BEH-004; REQ-004–REQ-006; AC-005, AC-006, AC-009, AC-010
- Scope status: `Within Approved Scope`
- Required update changes approved behavior: `No`
- Affected approved journey: opening Studio setup for an existing application, evaluating a saved/default resource, preserving an invalid or unavailable selection, saving a sparse override, resetting it, and launching in either host.
- Evidence: latest Personal persists `ApplicationConfiguredLaunchProfile` JSON with `memberAddress`/`displayName` in `__autobyteus_resource_configurations.launch_profile_json` through `ApplicationExecutionResourceConfigurationStore`. The finalized feature reuses the same physical table/column for `ApplicationLaunchOverride` with `memberRouteKey`/`memberName` and a different sparse-stage service through `ApplicationLaunchOverrideStore`. The design correctly selects current rooted identity and no migration, but it does not define the exact target persisted type/reader/writer, prove existing Personal agent/team rows are accepted unchanged, specify legacy/default/invalid row handling without automatic rewrite or fallback, or disposition the Personal-only current store. The inventory adds the feature store while omitting the current store.
- Material-premise validation: N/A — existing saved rows and Studio launch editing are explicitly preserved contracts.
- Required update: specify one target store/file and one exact persisted JSON contract using current rooted identity; map the current row fields into package baseline, selected-resource baseline, sparse saved override, and effective configuration without copying/seeding. Provide representative current agent/team/legacy/invalid/unavailable rows through the target reader and state whether any normalization writes are permitted. Name the old store/service removals or the single retained owner explicitly. If direct use is not actually possible, return the resulting migration/behavior question as a Requirement Gap rather than inventing a compatibility path.
- Why proportionate: this is the minimum evidence required for the already-approved no-migration outcome over a table whose semantic reader is changing.
- Recommended recipient: `/solution_designer`

## Classification

`Design Impact`

## Recommended Recipient

`/solution_designer`

## Residual Risks

- The 77 canonical changed-both paths still require a recorded implementation resolution ledger; the existing authority matrix is an appropriate basis after AR-001–AR-003 are closed.
- Generated/importable outputs must be deleted before source resolution and regenerated deterministically; whether a generated artifact remains tracked should follow the integrated devkit/package policy rather than ad hoc conflict choices.
- A later Personal advance can reopen these same intersections and must be audited at delivery rather than force-merged.
- Provider/Electron infrastructure availability remains an execution-evidence risk, not a reason to introduce mock fallback.

## Latest Authoritative Result

- Review Decision: `Fail — Design Impact`
- Material-Premise Gate: `Pass`
- Notes: The integration method and broad authority split pass. Implementation remains blocked until SR-001 is revised to close AR-001–AR-003 and a new architecture review passes.
