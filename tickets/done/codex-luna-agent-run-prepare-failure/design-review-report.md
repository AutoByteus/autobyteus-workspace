# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: /Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure/tickets/done/codex-luna-agent-run-prepare-failure/requirements.md
- Upstream Investigation Notes: /Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure/tickets/done/codex-luna-agent-run-prepare-failure/investigation-notes.md
- Reviewed Design Spec: /Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure/tickets/done/codex-luna-agent-run-prepare-failure/design-spec.md
- Supplemental Task Artifacts Reviewed:
  - /Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure/tickets/done/codex-luna-agent-run-prepare-failure/evidence/full-stack-reproduction/experiment-report.md
  - /Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure/tickets/done/codex-luna-agent-run-prepare-failure/evidence/full-stack-reproduction/
  - /Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure/tickets/done/codex-luna-agent-run-prepare-failure/evidence/reported-ui-error.png
  - Round 1 state of this canonical report and the architecture revision record, which supplied DI-001–DI-003 / PREM-001–PREM-003 to SR-002
- Solution Revision Record Reviewed: /Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure/tickets/done/codex-luna-agent-run-prepare-failure/solution-revision-record.md
- Relevant Solution Revision IDs: SR-001, SR-002
- Architecture Review Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure/tickets/done/codex-luna-agent-run-prepare-failure/architecture-review-revision-record.md
- Current Architecture Review Revision ID: ARCH-REV-002
- Current Review Round: 2
- Trigger: Re-review of SR-002, which claims resolution of Round 1 findings DI-001–DI-003 without changing the approved requirements.
- Prior Review Round Reviewed: Round 1 / ARCH-REV-001 / Fail
- Latest Authoritative Round: Round 2 / ARCH-REV-002
- Current-State Evidence Basis: Repository commit a098b205ca990bf86b5e452950a49fc5dc39c8d1; the current resolver/service, Codex and Claude materializers, bootstrappers, cleanup paths, run-manager/coordinator path and existing tests inspected in Round 1; retained full-stack production-path evidence; and direct verification of every SR-002 change in the revised design and investigation notes.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (Confirmed/Contradicted/Blocked): Confirmed
- Approved requirements / intended behavior understood: Repair only a verified broken workspace symlink; rebuild from a valid current configured source or remove-and-omit when unresolved; never mutate target content or live/unowned collisions; preserve provider/model and generic UI behavior; share policy across Codex and Claude.
- Relevant existing behavior and evidence confirmed: Preparation fails before runtime start on the observed broken old-source link; unlink-only control succeeds and rebuilds the current-source link; missing configured skills already warn/skip; Codex Luna starts directly; and current source exhibits the discovery-filter, final-cleanup, failed-batch and cause-logging seams recorded in Round 1.
- Scope guardrail confirmed (In-Scope Use Cases / Out of Scope / Preserved Behavior Boundary / Review Authority): Confirmed
- Approved change, preserved behavior, and outside scope understood: On-demand link reconciliation and internal diagnostics only. No target deletion, warning-only live collision, model fallback, UI warning transport, historical-path map, background sweep, compatibility wrapper, or change to the completed shell-CWD ticket is authorized.
- Every prospective blocking Design Impact finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID (Yes/No): Yes; no prospective blocker remains. The three prior findings remain traceable to FR-002/FR-007, AC-001/AC-006/AC-007, BEH-001/BEH-002 and UC-003 and are resolved by SR-002.
- Remaining material ambiguity, if any: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass — the production-equivalent stale-link path and unlink-only control establish the defect and recovery boundary. | Pass — every active binding becomes one request; reconcile-discoverable still inspects and repairs a broken expected path while leaving an initially missing path absent. | Confirmed | None |
| BEH-002 | System | Pass | Pass — duplicate materializers, existing registry behavior and supported acquire/release and multi-skill lifecycles are established. | Pass — one path-keyed acquiring → ready/held → releasing lifecycle plus occurrence-ledger rollback covers the complete holder lifecycle. | Confirmed | None |
| BEH-003 | Operational | Pass | Pass — manager wrapping/coordinator projection and retained screenshot/log evidence establish the preserved contract. | Pass — manager logs the original error object while the outer command/UI error remains generic. | Confirmed | None |
| BEH-004 | User / System | Pass | Pass — missing-skill warning/skip and resolver validation are confirmed. | Pass — safe unresolved identity reaches reconciliation; only a verified broken link is removed and the skill is omitted. | Confirmed | None |
| BEH-005 | Contract | Pass | Pass — direct Luna thread start and configuration pass-through are established. | Pass — no provider, model, client or frontend path is changed. | Confirmed | None |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| experiment-report.md | Pass | Pass | Pass | Pass | Pass — complete evidence, approval N/A | None |
| evidence/full-stack-reproduction/ | Pass | Pass | Pass | Pass | Pass — complete raw evidence, approval N/A | None |
| reported-ui-error.png | Pass | Pass | Pass | Pass | Pass — user-supplied evidence, approval N/A | None |
| Round 1 design-review-report.md state | Pass | Pass | Pass | Pass | Pass — prior review trigger, approval N/A; ARCH-REV-001 retains it after this canonical report moves to Round 2 | None |
| architecture-review-revision-record.md through ARCH-REV-001 | Pass | Pass | Pass | Pass | Pass — review history, approval N/A; ARCH-REV-002 is appended with this result | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The design identifies a bug fix with a current design issue. | None |
| Root-cause classification is explicit and evidence-backed | Pass | Missing link-state/holder invariants and duplicated Codex/Claude policy are tied to full-stack evidence and current source. | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | A focused shared-policy refactor is selected; unrelated sweep/UI/model/history work is deferred or rejected. | None |
| Refactor decision is supported by concrete design or residual-risk rationale | Pass | Request, state, phase, rollback, ownership, file, removal and deterministic coverage sections make the refactor actionable. | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary create/restore activation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Preparation-failure return/event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | One-request reconciliation state machine | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Final release overlapping a new acquisition | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Failed multi-request batch rollback | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| SkillService.resolveConfiguredSkillBindingsForAgent | Pass | Pass | Pass | Pass | Resolver validation remains authoritative; raw names do not reach filesystem code. |
| WorkspaceSkillMaterializer.materializeConfiguredWorkspaceSkills | Pass | Pass | Pass | Pass | Request intent, path policy, phased acquisition and call rollback are owned together; bootstrappers cannot filter reconciliation input or receive partial state. |
| cleanupMaterializedWorkspaceSkills | Pass | Pass | Pass | Pass | Release and guarded cleanup stay behind the same path-keyed lifecycle. |
| AgentRunManager.prepare* | Pass | Pass | Pass | Pass | Original-error observation and safe wrapping remain at the lifecycle boundary. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Skills resolver/service | Pass | Pass | Pass | Pass | Domain binding does not depend on runtime/filesystem concerns. |
| Runtime bootstrappers → shared materializer | Pass | Pass | Pass | Pass | Bootstrappers plan one request per binding; the shared owner decides filesystem behavior. |
| Runtime cleanup → shared materializer | Pass | Pass | Pass | Pass | Cleanup callers do not mutate registry state or filesystem links directly. |
| Manager → coordinator/UI | Pass | Pass | Pass | Pass | Internal error details do not cross the user-safe transport boundary. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Resolver binding and resolved-only projection methods | Pass | Pass | Pass | Low | Pass |
| materializeConfiguredWorkspaceSkills | Pass | Pass | Pass | Low | Pass |
| cleanupMaterializedWorkspaceSkills | Pass | Pass | Pass | Low | Pass |
| Runtime singleton/profile getters | Pass | Pass | Pass | Low | Pass |
| Manager preparation boundary | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Safe configured identity | Pass | Pass | Pass | Pass | Extend the existing resolver/service authority with a tight binding union. |
| Cross-runtime workspace-link policy | Pass | Pass | Pass | Pass | Consolidate duplicated algorithms under the existing shared backend area. |
| Codex discovery preflight | Pass | Pass | N/A | Pass | Preserve it as request annotation rather than input deletion. |
| Preparation diagnostics | Pass | Pass | N/A | Pass | Extend the existing manager catch boundary only. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Skills domain/services | Pass | Pass | Pass | Pass | Binding identity and validation stay runtime-agnostic. |
| Shared agent-execution backends | Pass | Pass | Pass | Pass | One owner holds request/state policy, phases, rollback and cleanup. |
| Codex backend | Pass | Pass | Pass | Pass | Owns discovery and profile composition only. |
| Claude backend | Pass | Pass | Pass | Pass | Owns profile/session composition only. |
| Agent run services | Pass | Pass | Pass | Pass | Manager owns original-error logging; coordinator stays unchanged. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Resolved/unresolved configured identity | Pass | Pass | Pass | Pass | Small skills-domain union reused across the resolver/service/runtime boundary. |
| Request, link-state, registry, mutation, rollback and cleanup logic | Pass | Pass | Pass | Pass | These form one coherent cross-runtime filesystem/holder lifecycle. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| ConfiguredAgentSkillBinding | Pass | Pass | Pass | Pass | Pass | Resolved and safe-unresolved identity are mutually exclusive. |
| WorkspaceSkillReconciliationRequest | Pass | Pass | Pass | Pass | Pass | Three variants encode exposure/discovery/unresolved intent without parallel booleans. |
| WorkspaceSkillMaterializationProfile | Pass | Pass | Pass | Pass | Pass | Provider specialization is limited to label and root segments. |
| MaterializedWorkspaceSkill | Pass | Pass | Pass | Pass | Pass | The descriptor represents one acquired holder occurrence. |
| Private path-state union | Pass | Pass | Pass | Pass | Pass | Missing, same-source, broken, live-different and non-symlink/error outcomes remain distinct. |
| Private phased registry entry | Pass | Pass | Pass | Pass | Pass | One path key and one acquiring/ready/releasing union prevent split locks or stale cleanup exposure. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| skills/domain/configured-agent-skill-binding.ts | Pass | Pass | Pass | Pass | Tight shared identity/projection only. |
| Resolver/service files | Pass | Pass | Pass | Pass | Existing validation and facade responsibilities remain clear. |
| backends/shared/workspace-skill-materializer.ts | Pass | Pass | Pass | Pass | Cohesive link and holder lifecycle; provider protocol stays out. |
| Codex/Claude materializer composition files | Pass | Pass | Pass | Pass | Fixed profiles and cached shared instances only. |
| Runtime bootstrappers/context/cleanup files | Pass | Pass | Pass | Pass | Existing orchestration moves directly to shared contracts. |
| agent-run-manager.ts | Pass | Pass | N/A | Pass | Logging stays at the existing preparation failure boundary. |
| Related test files | Pass | Pass | Pass | Pass | Shared matrix/lifecycle coverage is separated from provider placement/wiring coverage. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| src/skills/domain/configured-agent-skill-binding.ts | Pass | Pass | Low | Pass | Runtime-agnostic validated identity. |
| src/agent-execution/backends/shared/workspace-skill-materializer.ts | Pass | Pass | Low | Pass | One bounded cross-runtime lifecycle owner is proportionate. |
| Runtime-specific composition files | Pass | Pass | Low | Pass | Provider placement remains local without policy duplication. |
| Existing bootstrapper/context/cleanup/manager files | Pass | Pass | Low | Pass | Caller and diagnostic changes remain with current owners. |
| Shared and runtime-specific tests | Pass | Pass | Low | Pass | Full policy/lifecycle matrix is centralized; provider tests retain placement/wiring only. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Duplicate Codex/Claude algorithms, descriptors and method types | Pass | Pass | Pass | Pass | Runtime files remain composition roots, not compatibility facades. |
| Duplicate runtime state-matrix tests | Pass | Pass | Pass | Pass | Shared suite owns policy; runtime suites own profile placement/wiring. |
| Historical path/fallback candidates | Pass | Pass | Pass | Pass | Explicitly rejected; current resolver plus on-demand rebuild is authoritative. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Runtime-specific materialization algorithms/APIs | No | Pass | Pass | Callers move directly to shared types/methods in one change. |
| Historical skill locations | No | Pass | Pass | No old-path lookup, source map, migration or fallback remains. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Workspace skill symlink projections | Discard or Rebuild | Pass | Pass | N/A | Pass | Every configured path reaches on-demand reconciliation; only a verified broken link is discarded, current source is authoritative, and no broad migration is needed. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Binding and shared-policy extraction | Pass | Pass | Pass | Pass |
| Codex discovery-to-request planning | Pass | Pass | Pass | Pass |
| Per-key acquire/release and call-scoped rollback | Pass | Pass | Pass | Pass |
| Runtime caller conversion and duplicate removal | Pass | Pass | Pass | Pass |
| Manager diagnostics and preserved transport | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Link state, mutation boundary and diagnostics | Yes | Pass | Pass | Pass | Good/bad shapes distinguish link-only repair from unsafe mutation. |
| Discoverable skill with a broken expected path (DI-001) | Yes | Pass | Pass | Pass | The revised example preserves discovery preflight while repairing the path. |
| Acquisition during final cleanup (DI-002) | Yes | Pass | Pass | Pass | The revised example shows publish-before-await, wait and rematerialize. |
| Later batch failure after earlier acquisition (DI-003) | Yes | Pass | Pass | Pass | The revised example shows reverse release and exact original-error rethrow. |

## Material Premise Validation (Only When Needed)

The three stable premises remain applicable because they justify the corrected lifecycle machinery. Their reachability is unchanged; SR-002 now addresses each proportionately.

### PREM-001 — Codex discovers a configured skill while its expected workspace link is broken

- Related approved requirement or established contract: FR-002, FR-007; AC-001, AC-006; preserved Codex skills/list preflight.
- Relevant behavior ID(s): BEH-001, BEH-002.
- Initiating basis kind: User / Contract.
- Independent product-supported initiating trigger or applicable governing contract: A user sends the first message to a Codex run for an agent with an active configured skill; Codex's supported discovery preflight reports the same skill name from another discovery scope.
- Support evidence: The Agents run surface and SEND_MESSAGE activation path are in the retained production evidence; the current Codex bootstrap test covers user-scope discovery; the approved prior materialization/source-move lifecycle independently produces the broken expected link.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: SEND_MESSAGE → manager → Codex bootstrapper → safe binding → skills/list annotation → reconcile-discoverable request → shared materializer inspects broken expected path → guarded repair → runtime start.
- Lifecycle preconditions and material consequence at the claimed point: A broken projection remains after the source moved while another discovery scope reports the name. Omitting the binding would bypass FR-002/FR-007; the revised request path prevents that.
- Reachability: Reachable.
- Review consequence / proportionate response: SR-002 resolves DI-001; discovery changes only the initial-missing action and never removes reconciliation input.

### PREM-002 — A new holder acquires the same workspace path while final-holder cleanup is in flight

- Related approved requirement or established contract: AC-007 and preserved holder-count cleanup behavior.
- Relevant behavior ID(s): BEH-002.
- Initiating basis kind: User / System.
- Independent product-supported initiating trigger or applicable governing contract: One supported run terminates while another supported create/restore activation begins for the same runtime profile, workspace and configured source.
- Support evidence: Activation and termination are supported product lifecycles; existing materializer tests model multiple holders; AC-007 governs prevention of premature cleanup.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: old run release → ready entry transitions to releasing before cleanup await concurrently with new activation acquire → sees releasing → waits cleanup → retries/reclassifies/rematerializes → returns live descriptor.
- Lifecycle preconditions and material consequence at the claimed point: Without shared serialization, old cleanup can remove a link returned to the new holder. The mapped releasing phase prevents that consequence.
- Reachability: Reachable.
- Review consequence / proportionate response: SR-002 resolves DI-002 with one materialized-path key, mapped cleanup phase, wait/retry behavior and deterministic gate-based coverage.

### PREM-003 — A later binding fails after an earlier binding was acquired in the same materialization call

- Related approved requirement or established contract: AC-007; UC-003; BEH-002 materialization lifecycle.
- Relevant behavior ID(s): BEH-002, BEH-003.
- Initiating basis kind: User / Contract.
- Independent product-supported initiating trigger or applicable governing contract: A user activates an agent with multiple configured skills; a later configured path is an approved live-different or non-symlink collision.
- Support evidence: Configured skill names are ordered/multiple, materialization is sequential, and UC-003 plus AC-008/AC-009 establish fail-closed later collision behavior.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: SEND_MESSAGE → bootstrapper → batch acquires earlier descriptor occurrence → later request throws → materializer reverses its occurrence ledger through the same release lifecycle → rethrows the exact original error → manager logs/wraps.
- Lifecycle preconditions and material consequence at the claimed point: The bootstrapper cannot own a partial batch, so earlier holders would otherwise be stranded. The call ledger releases only this invocation's occurrences and preserves other holders.
- Reachability: Reachable.
- Review consequence / proportionate response: SR-002 resolves DI-003 with reverse exhaustive rollback, rollback-error logging and exact original-error rethrow.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

Pass — SR-002 preserves the approved link-only repair boundary and completes the three previously missing production lifecycles. The design is actionable and ready for implementation.

## Findings

None. Prior findings DI-001, DI-002 and DI-003 are verified resolved in ARCH-REV-002.

## Classification

N/A — Pass

## Recommended Recipient

/implementation_engineer

## Residual Risks

- Unsupported arbitrary filesystem mutation remains outside scope; live different symlinks, non-symlink collisions and non-ENOENT failures remain fail-closed rather than repaired.
- Implementation correctness depends on preserving the exact path-keyed phase transition, publish-before-await cleanup ordering, exact-entry guards and occurrence-ledger semantics specified by the design; deterministic tests are already required for these invariants.
- No background repair or historical-path migration exists by design; qualifying persisted links are reconciled only when the supported create/restore bootstrap path runs.

## Latest Authoritative Result

- Review Decision: Pass
- Material-Premise Gate (Pass/Fail/Blocked): Pass — PREM-001–PREM-003 retain independent supported triggers/contracts and are addressed without new product behavior.
- Notes: ARCH-REV-002 verifies SR-002 and closes DI-001–DI-003; implementation may proceed within the approved requirements and explicit no-expansion boundaries.
