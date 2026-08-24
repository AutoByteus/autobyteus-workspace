# Hierarchical TeamRun Launch Configuration — Solution Revision Record

The current `requirements.md`, `investigation-notes.md`, `design-spec.md`, `hierarchical-launch-configuration-behavior.md`, and `team-execution-tree-v2-contract.md` remain authoritative. This record is only the round/rationale index.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | User-prioritized prerequisite / bootstrap baseline | N/A | Initial Baseline | Draft package created; design blocked for clarification/approval |
| SR-002 | User approval and migration-design direction / solution round 2 | N/A | Initial Baseline completion | Approved implementation-ready design complete; held for user review |
| SR-003 | User design review / solution round 3 | USER-DR-001 | Design Impact | Shared launch value and execution-tree node naming tightened; user review continues |
| SR-004 | User design review / solution round 4 | USER-DR-002 | Design Impact | Concrete V2 execution-tree contract and materialized example added |
| SR-005 | User design review / solution round 5 | USER-DR-003 | Unclear | Retain both the `FileV2` type suffix and persisted schema discriminator |
| SR-006 | User approval / solution round 6 | USER-APPROVAL-001 | Approval | Concrete contract approved and user-review hold released for architecture review |
| SR-007 | User-directed failed-disk recovery / solution round 7 | REC-001 | Unclear / Recovery | Verified recoverable state restored; missing V2 contract reconstructed; architecture review must be re-established |
| SR-008 | Code reviewer CRR-010 / solution round 8 | CR-008, CR-009; MP-CR-006, MP-CR-007 | Design Impact | Integrated workspace lifecycle and configured-root identity boundaries redesigned; architecture re-review required |

## Revision Entries

### SR-001 — Bootstrap Baseline

- Date: 2026-08-24
- Triggering role, report path, and round: User-prioritized prerequisite identified during Dynamic AgentTeam discovery; bootstrap round
- Triggering finding IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Dedicated latest-base ticket and Draft requirements package created; design blocked pending approval
- Why this baseline or revision entry is recorded: establish the isolated ticket and initial problem boundary before deeper investigation.
- Resolution / baseline established:
  - every nested TeamRun is a launch-configuration scope;
  - parent inheritance with canonical Team-address scoped overrides;
  - nearest-Team then exact-Agent resolution;
  - separate editable intent and complete runtime/persistence snapshots;
  - per-TeamRun effective default persisted alongside existing per-Agent resolved settings;
  - root-only launch presets remain valid through inheritance;
  - Dynamic AgentTeam declared downstream dependency.
- Approved behavior or requirement IDs affected: N/A; requirements were Draft.
- Canonical artifacts and sections updated: `requirements.md`, `investigation-notes.md`, placeholder `design-spec.md`.
- Supplemental artifacts updated, added, or removed: added `hierarchical-launch-configuration-behavior.md` as Draft intended behavior.
- Downstream and architecture-review impact: no architecture-review handoff until the requirements basis is approved and the design spec is complete.
- Next recipient or routing: user clarification/approval.
- Remaining gaps or risks: nested definition default policy, scoped field set, application setup UI scope, historical persisted-data outcome, and complete launch/history caller inventory.

### SR-002 — Approved Hierarchical Launch And V2 Migration Design

- Date: 2026-08-24
- Triggering role, report path, and round: user approved the complete requirements/behavior bundle and directed solution design, with explicit instruction to study the production migration convention and latest two migration designs; solution round 2
- Triggering finding IDs: N/A
- Prior authoritative result: Draft package with unresolved product decisions and placeholder design.
- Current authoritative result: `Design-ready` approved requirements, approved intended-behavior supplement, completed evidence record, and implementation-ready design; intentionally not submitted to architecture review.
- Why this baseline or revision entry is recorded: mark the first complete solution handoff after the user resolved scope and migration policy.
- Resolution:
  - nested workspace Team scopes author runtime, model/model config, workspace, and auto-execute; `skillAccessMode` remains root-authored/inherited;
  - root-only definition defaults, mobile, application, external, and programmatic authoring rules are explicit;
  - one web hierarchy owner resolves root -> nearest Team -> exact Agent while immutable store/UI owners remain separate;
  - backend receives and validates complete Team and Agent snapshots; new runs never infer Team policy from a coordinator;
  - configured Team defaults are required in runtime, V2 persistence, V2 transport, restore, and read-only views;
  - V1 history uses one registered deterministic coordinator-derived transform, exact before/after validation, the existing atomic writer/runner/manual Retry, bounded diagnostics, and no backup/journal/dual runtime;
  - exact V1 knowledge moves into the retained migration boundary before normal runtime becomes V2-only.
- Approved behavior or requirement IDs affected: BEH-001–BEH-009; R-001–R-041; AC-001–AC-034.
- Canonical artifacts and sections updated: all sections of `requirements.md`, `investigation-notes.md`, and `design-spec.md`.
- Supplemental artifacts updated, added, or removed: `hierarchical-launch-configuration-behavior.md` changed to Approved and aligned with final field/surface/migration decisions.
- Downstream and architecture-review impact: the package is ready for personal user review. Do not message `/architecture_reviewer` until the user explicitly releases the hold. No implementation is authorized through this handoff alone.
- Next recipient or routing: user review.
- Remaining gaps or risks: no material product/design question remains; architecture review and downstream implementation/testing remain pending after the user's review.

### SR-003 — Tighten Launch-Value And Execution-Node Naming

- Date: 2026-08-24
- Triggering role, report path, and round: user personal design review; solution round 3
- Triggering finding IDs: `USER-DR-001`
- Prior authoritative result: SR-002 used the proposed shared name `TeamRunLaunchConfiguration` in several design mappings and retained nonparallel current execution-tree type names in the target discussion.
- Current authoritative result: the shared complete executable value is canonically `AgentLaunchConfiguration`; target execution-tree node types use a parallel `*ExecutionNode` family.
- Why this baseline or revision entry is recorded: a Team does not launch an LLM runtime. It stores the same Agent launch value as a default, so a Team-specific shared value name is misleading. The existing union/concrete type names also obscure their tree roles.
- Resolution:
  - use `AgentLaunchConfiguration` for runtime/model/LLM config/auto-execute/skill/workspace;
  - use `ConfiguredAgentExecutionNode.launchConfiguration: AgentLaunchConfiguration`;
  - use `ConfiguredTeamExecutionNode.defaultLaunchConfiguration: AgentLaunchConfiguration` and the same property on `RootConfiguredTeamExecutionNode`;
  - use `ConfiguredExecutionNode` as the recursive union of the Agent and Team node variants;
  - reject both `TeamRunLaunchConfiguration` and `TeamRunLaunchConfigurationSnapshot`.
- Approved behavior or requirement IDs affected: no behavior change; naming clarifies R-023–R-026, R-030–R-031, R-035, and R-037.
- Canonical artifacts and sections updated: `design-spec.md` naming, reusable-structure, tightness, and concrete-shape sections; `investigation-notes.md` source log.
- Supplemental artifacts updated, added, or removed: none; the approved behavior contract was already semantically aligned.
- Downstream and architecture-review impact: implementation must use the corrected names; architecture review remains on hold for the user's personal review.
- Next recipient or routing: user review.
- Remaining gaps or risks: none introduced by the naming correction.

### SR-004 — Materialize The V2 Execution-Tree Contract

- Date: 2026-08-24
- Triggering role, report path, and round: user personal design review; solution round 4
- Triggering finding IDs: `USER-DR-002`
- Prior authoritative result: SR-003 named the target types, while the complete execution-tree shape remained distributed between compact design examples and current-code references.
- Current authoritative result: one dedicated proposed contract defines the complete TypeScript structure, materialization rules, exact realistic JSON, legacy runtime-label mapping, and explicitly excluded shapes.
- Why this baseline or revision entry is recorded: implementation and review should see how inherited Team defaults and exact Agent configurations materialize in a real stored root/nested execution tree without reconstructing the object from prose.
- Resolution:
  - added `team-execution-tree-v2-contract.md`;
  - made root address `/` explicit in V2;
  - fixed V2 serialization to the current `RuntimeKind` enum values;
  - showed a customized `/research` Team, exact `/research/reviewer` Agent override, and inherited `/delivery` Team as complete stored snapshots;
  - specified deterministic V1 uppercase-runtime decoding and coordinator-derived Team defaults;
  - linked the contract from all three core artifacts and the canonical supplement inventory.
- Approved behavior or requirement IDs affected: no behavior change; concretizes R-021–R-031, R-035, R-037 and AC-016–AC-023, AC-030.
- Canonical artifacts and sections updated: `requirements.md` supplement inventory/approval status; `investigation-notes.md` supplement inventory/source log; `design-spec.md` supplement, persistence, migration, example, and file-mapping sections.
- Supplemental artifacts updated, added, or removed: added `team-execution-tree-v2-contract.md` with status `Proposed design contract for user review`.
- Downstream and architecture-review impact: the exact proposed V2 schema must be reviewed as part of the current user hold before architecture review or implementation.
- Next recipient or routing: user review.
- Remaining gaps or risks: user approval of the concrete contract is pending; the already-approved product behavior remains unchanged.

### SR-005 — Retain Explicit V2 Type And Payload Markers

- Date: 2026-08-24
- Triggering role, report path, and round: user personal design review; solution round 5
- Triggering finding IDs: `USER-DR-003`
- Prior authoritative result: the proposed contract used `TeamRunExecutionTreeFileV2` and `schemaVersion: 2`, but their apparent naming redundancy had no recorded decision.
- Current authoritative result: both markers remain intentionally.
- Why this baseline or revision entry is recorded: the compile-time type suffix and materialized field serve different readers, and the user explicitly chose not to simplify the type name.
- Resolution: retain `TeamRunExecutionTreeFileV2`; retain required persisted `schemaVersion: 2`; document that migration/storage code classifies the payload field while TypeScript users see the versioned contract name.
- Approved behavior or requirement IDs affected: no behavior change; clarifies R-025, R-026, and R-037.
- Canonical artifacts and sections updated: `design-spec.md` naming check; `investigation-notes.md` source log.
- Supplemental artifacts updated, added, or removed: clarified `team-execution-tree-v2-contract.md` contract principles.
- Downstream and architecture-review impact: implementation must retain both version markers; user review hold remains in effect.
- Next recipient or routing: user review.
- Remaining gaps or risks: none introduced by this retained naming choice.

### SR-006 — Approve Complete Solution Package And Release Review Hold

- Date: 2026-08-24
- Triggering role, report path, and round: user completed personal design review and explicitly authorized architecture review; solution round 6
- Triggering finding IDs: `USER-APPROVAL-001`
- Prior authoritative result: approved behavioral requirements and completed design remained under a user-review hold; the concrete V2 execution-tree contract was still marked proposed.
- Current authoritative result: the requirements basis, intended-behavior supplement, concrete V2 execution-tree contract, investigation evidence, and design are approved and ready for architecture review.
- Why this baseline or revision entry is recorded: record approval of the materialized contract and release the explicit no-handoff constraint before submitting the cumulative package.
- Resolution:
  - approve `team-execution-tree-v2-contract.md`, including `AgentLaunchConfiguration`, parallel `*ExecutionNode` names, `TeamRunExecutionTreeFileV2`, and persisted `schemaVersion: 2`;
  - retain the V1-to-V2 coordinator-derived reconstruction and canonical runtime-label conversion;
  - retain a forward-only V2 application/runtime boundary;
  - allow application startup and unaffected V2 TeamRuns to continue when a V1 TeamRun migration fails, while truthfully recording migration failure, excluding the affected run, and preserving manual Retry;
  - authorize architecture-review handoff.
- Approved behavior or requirement IDs affected: no scope change; final approval covers BEH-001–BEH-009, R-001–R-041, and AC-001–AC-034.
- Canonical artifacts and sections updated: approval/status sections in `requirements.md`, `investigation-notes.md`, and `design-spec.md`.
- Supplemental artifacts updated, added, or removed: `team-execution-tree-v2-contract.md` marked Approved; `hierarchical-launch-configuration-behavior.md` updated to record release of the user-review hold.
- Downstream and architecture-review impact: submit the full cumulative package to `/architecture_reviewer`; implementation remains gated on that review result.
- Next recipient or routing: `/architecture_reviewer`.
- Remaining gaps or risks: no material requirement or design question remains; architecture review must assess design readiness and may return requirement gaps or design impacts through the normal rework path.

### SR-007 — Recover Verified Solution State And Re-Establish The Review Gate

- Date: 2026-08-24
- Triggering role, report path, and round: user-directed recovery from `/Users/normy/Downloads/hierarchical-team-run-launch-config-recovered-delta-20260824.zip`; `recovery-audit.md`; solution round 7
- Triggering finding IDs: `REC-001`
- Prior authoritative result: SR-006 recorded a user-approved cumulative solution package ready for architecture review.
- Current authoritative result: all readable solution/source files and recorded deletions are restored on the reconstructed historical base; the approved V2 contract has a semantically aligned reconstruction; the prior architecture-review result and later stage artifacts remain unavailable.
- Why this baseline or revision entry is recorded: recovery metadata proves that twelve indexed files could not be copied from the failed disk. Missing review records cannot be treated as evidence of a prior pass, and four missing frontend source/test files make the implementation snapshot incomplete.
- Resolution:
  - verified archive integrity and SHA-256;
  - reconstructed the recorded post-rebase ticket base rather than applying the delta to the older remote bootstrap commit;
  - restored 138 files with exact declared blob matches and applied four recorded deletions;
  - recorded all twelve unavailable paths and blob IDs in `recovery-audit.md`;
  - reconstructed `team-execution-tree-v2-contract.md` from unchanged approved semantics and recovered current-schema implementation, without claiming byte identity;
  - selected fresh architecture review as the earliest trustworthy continuation point.
- Approved behavior or requirement IDs affected: none; BEH-001–BEH-009, R-001–R-041, and AC-001–AC-034 remain unchanged.
- Canonical artifacts and sections updated: recovery status/provenance and supplement inventories in `requirements.md`, `investigation-notes.md`, and `design-spec.md`; this SR-007 entry.
- Supplemental artifacts updated, added, or removed: reconstructed `team-execution-tree-v2-contract.md`; added evidence-only `recovery-audit.md`.
- Downstream and architecture-review impact: architecture review must confirm the reconstructed contract's semantic equivalence and issue a new authoritative design-review report. If passed, implementation engineering must reconstruct the four missing frontend source/test files, validate all recovered code, and issue new implementation artifacts before code review.
- Next recipient or routing: `/architecture_reviewer`.
- Remaining gaps or risks: original byte identity for the V2 contract is unrecoverable; the prior design-review/code-review/API-E2E results cannot be inferred; the implementation snapshot is incomplete until the four missing source/test files are rebuilt and validated.

### SR-008 — Unify Team Workspace Lifecycle And Post-Validation Identity Allocation

- Date: 2026-08-24
- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/code-review-report.md`; CRR-010 / solution round 8
- Triggering finding IDs: `CR-008`, `CR-009`; material premises `MP-CR-006`, `MP-CR-007`
- Prior authoritative result: CRR-010 `Fail — Design Impact`, 8.9/10. IR-006 source-resolved CR-007/API-E2E-F-002 and passed 7 focused files / 106 tests, but the full integrated review found two blocking ownership/order defects.
- Current authoritative result: the approved product basis is unchanged; the corrected design establishes one per-draft topology-aware Team workspace lifecycle and one planner-owned post-validation configured identity phase. The package is ready for architecture re-review, not implementation or API/E2E.
- Why this revision entry is recorded: the integrated controlled-workspace design and hierarchical draft design left parallel exact-address authorities, while the configured root identity API contradicted DS-003. Repeated local fixes would preserve both structural causes.
- Resolution:
  - attach Team workspace selection mode, active/inactive New-path buffer, and loading/error state to the owning immutable `TeamLaunchDraft` under `teamRunConfigStore`;
  - keep canonical existing workspace identity only in `TeamRunConfig`, deriving it for presentation rather than duplicating it in transient state;
  - make one store transition reconcile configuration overrides and every Team workspace entry by exact address/kind, preserving root and valid same-draft buffers while pruning/reporting removed, renamed, moved, or kind-changed subjects;
  - make `RunConfigPanel` presentation-only and delegate the exact selected draft once to `agentTeamRunStore.launchDraft`;
  - define DS-008: store lock/reconcile/plan -> token/current-topology authorization -> deduplicated `workspaceStore` registration -> token-checked store commit/failure -> final reconciliation/readiness -> exact admission/create;
  - remove the panel Team workspace map/registration loop, selected-context-global Team loading map, broad-watcher option, and second post-preparation gate;
  - inject `TeamRunIdentityAllocator` into `TeamDefinitionTopologyPlanner`, complete exact graph/coverage/kind/definition/skill validation first, then allocate configured root/nested Team and Agent identities;
  - remove public/optional root TeamRun ID preallocation from service/planner/application contracts; application persistence uses the successfully created root's returned ID;
  - require real-store topology/preparation coverage and zero-allocation/manager/persistence assertions for invalid full and root-only/application creates.
- Approved behavior or requirement IDs affected: no scope change; clarifies and enforces BEH-004, BEH-005, BEH-008, BEH-009; UC-007; R-017, R-022; AC-015, AC-017 plus the integrated controlled-workspace preserved contract.
- Canonical artifacts and sections updated: `requirements.md` current review provenance only; `investigation-notes.md` integrated source/probe evidence, current behavior paths, design-health findings, and architecture-review notes; `design-spec.md` current state, intended correction, DS-001/DS-003/DS-007/DS-008, ownership, interfaces, lifecycle transitions, file mapping, removals, sequence, tests, tradeoffs, risks, and implementation guidance.
- Supplemental artifacts updated, added, or removed: `hierarchical-launch-configuration-behavior.md` now makes valid same-draft active/inactive buffer stability, context isolation, topology pruning, reset, and pre-registration repair explicit. `team-execution-tree-v2-contract.md` and `recovery-audit.md` are unchanged; `ARCH-REV-001` already confirmed semantic equivalence of the reconstructed V2 contract.
- Downstream and architecture-review impact: architecture reviewer must review SR-008 before implementation. If passed, route the cumulative package to implementation engineering for IR-007 or the next revision; then complete source review. Do not resume API/E2E-014 or delivery until those gates pass.
- Next recipient or routing: `/architecture_reviewer`.
- Remaining gaps or risks: architecture review is pending; exact API-E2E-014 remains pending after corrected source review; a topology change after an external workspace registration has already begun may leave an unused registered workspace, but token/final reconciliation forbids stale config attachment or TeamRun launch and no unapproved rollback/delete policy is introduced.
