# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-improvement-naming-refactor/tickets/done/skill-improvement-naming-refactor/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-improvement-naming-refactor/tickets/done/skill-improvement-naming-refactor/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-improvement-naming-refactor/tickets/done/skill-improvement-naming-refactor/design-spec.md`
- Current Review Round: 2
- Trigger: Revised package after round 1 fail, plus user clarification that the feature is disabled/development-phase/no-user and should use a clean-state/no-data-migration contract while preserving manual Skill Improvement behavior.
- Prior Review Round Reviewed: Round 1 in this same report path before rewrite; findings AR-SI-001 through AR-SI-003 rechecked.
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Reviewed updated requirements, investigation notes, design spec, design rework notes, and sampled current code in `self-evolution` run/session stores, service flow, server settings, and built-in registry under `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-improvement-naming-refactor`.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial review of migration-based clean-cut rename design | N/A | AR-SI-001, AR-SI-002, AR-SI-003 | Fail | No | Migration safety, old built-in session continuity, and run-record scope needed design work. |
| 2 | Revised no-migration clean-state design after user clarification | AR-SI-001, AR-SI-002, AR-SI-003 | None | Pass | Yes | Prior blockers resolved by explicit clean-state/no-data-migration contract and global run-record scope clarification. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-improvement-naming-refactor/tickets/done/skill-improvement-naming-refactor/design-spec.md` round 2 revision.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design spec identifies Refactor/Cleanup and describes the current stale `self-evolution`/`evolver`/`companion` naming spread. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Classification is File Placement Or Responsibility Drift plus Legacy Or Compatibility Pressure; investigation lists stale source, GraphQL, UI, settings, runtime path, task metadata, and built-in id surfaces. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor needed now; design rejects source-only rename and compatibility aliases. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Design maps spines, ownership, files, removal/decommission, no-migration/no-fallback policy, and behavior-preservation boundary. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-SI-001 | High | Resolved | Requirements FR-SI-007 and design Legacy Removal / Migration-Refactor sections now explicitly exclude app-data migration, conflict handling, old-data cleanup routines, and startup gating. The no-migration path is backed by user clarification in requirements and rework notes. | The original finding was caused by an under-specified migration. The migration mechanism has been removed from scope, so startup gating is no longer a design dependency. |
| 1 | AR-SI-002 | High | Resolved | Requirements FR-SI-009 and FR-SI-010 define the new clean-state built-in id and explicitly exclude old built-in id session continuity. Design rejection log rejects old-id aliases and old local helper-run preservation. | Old local development sessions/data are outside the runtime contract per user clarification. |
| 1 | AR-SI-003 | Medium | Resolved | Requirements FR-SI-005 and FR-SI-006 now distinguish target-scoped improver session state from global app-memory run records. Design ownership and interface mapping keep `getSkillImprovementRunRecord(improvementRunId)` global with no target selector. | Aligns with current code shape where the run store defaults to the app memory root and the session store is target-scoped. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Manual Skill Improvement flow | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Capability setting toggle | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Clean-state startup/built-in id | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Direct-message/notification return event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Improver completion watcher | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `skill-improvement` server capability | Pass | Pass | Pass | Pass | Correct owner for the full capability, not just the improver actor. |
| `improver-session` service grouping | Pass | Pass | Pass | Pass | Correctly isolates Retrospective Skill Improver lifecycle under the capability owner. |
| GraphQL Skill Improvement boundary | Pass | Pass | Pass | Pass | Transport-only, no old aliases. |
| Web Skill Improvement UI/stores | Pass | Pass | Pass | Pass | Rename is coherent across documents/stores/components/localization. |
| Built-in agents | Pass | Pass | Pass | Pass | Existing bootstrap/registry is extended to new clean-state id. |
| App-data migrations | Pass | Pass | Pass | Pass | Correct decision is “do not use” for this feature rename after user clarification. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Domain model/settings/message constants | Pass | Pass | Pass | Pass | Centralized under Skill Improvement domain. |
| GraphQL converters | Pass | Pass | Pass | Pass | Keeps transport mapping out of domain service. |
| Work trace projection | Pass | Pass | Pass | Pass | Reused from `agent-work-traces`; no format ownership drift. |
| Historical old-term allowlist | Pass | Pass | Pass | Pass | Correctly limits old terms to historical migration/fixtures/ticket artifacts, not active runtime names. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Skill Improvement run record | Pass | Pass | Pass | Pass | Pass | Uses `improvementRunId`, `improverRunId`, `improverAgentDefinitionId`, global app-memory path. |
| Improver session state | Pass | Pass | Pass | Pass | Pass | Uses `currentImproverRunId`, `priorImproverRunIds`, target-scoped session path. |
| Settings keys/default built-in id | Pass | Pass | Pass | Pass | Pass | Only new clean-state keys/id remain active. |
| GraphQL schema | Pass | Pass | Pass | Pass | Pass | New API names; old names removed rather than aliased. |
| Task-message metadata | Pass | Pass | Pass | Pass | Pass | `skill_improvement_*` metadata and unchanged `skill_update` business message type. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/self-evolution` and active tests | Pass | Pass | Pass | Pass | Move to `src/skill-improvement` / `tests/skill-improvement`; no alias barrel. |
| Old GraphQL API names | Pass | Pass | Pass | Pass | Removed; web/codegen updated. |
| Old web/UI names | Pass | Pass | Pass | Pass | Components, stores, localization, helper-run constants renamed. |
| Old setting keys | Pass | Pass | Pass | Pass | Runtime uses only new keys; no fallback. |
| Old built-in id | Pass | Pass | Pass | Pass | New clean-state id; no old id alias/session continuity. |
| Old persisted state paths | Pass | Pass | Pass | Pass | New clean-state paths; no old path reads. |
| Data migration/old-data cleanup routines | Pass | N/A | Pass | Pass | Explicitly not added; stale source code still removed/renamed. |
| Historical migration/cleanup references | Pass | N/A | Pass | Pass | Allowlisted when their subject is historical old data. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/skill-improvement/domain/models.ts` | Pass | Pass | N/A | Pass | Central domain vocabulary. |
| `autobyteus-server-ts/src/skill-improvement/services/skill-improvement-service.ts` | Pass | Pass | N/A | Pass | Governing manual-flow owner; behavior preservation is explicit. |
| `autobyteus-server-ts/src/skill-improvement/services/improver-session/*` | Pass | Pass | N/A | Pass | Actor lifecycle/session/task packet owner. |
| `autobyteus-server-ts/src/skill-improvement/services/skill-improvement-run-store.ts` | Pass | Pass | N/A | Pass | Global app-memory run record persistence. |
| `autobyteus-server-ts/src/api/graphql/types/skill-improvement*.ts` | Pass | Pass | N/A | Pass | Transport/resolver/types/converter split follows existing pattern. |
| Web `skillImprovement*` files/components | Pass | Pass | N/A | Pass | UI and state responsibility mapping is clear. |
| `autobyteus-server-ts/docs/modules/skill_improvement.md` | Pass | Pass | N/A | Pass | Replaces stale module doc. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| GraphQL -> Skill Improvement service | Pass | Pass | Pass | Pass | Thin resolver; no workflow policy. |
| Skill Improvement service -> projection/session/record owners | Pass | Pass | Pass | Pass | No work trace internals or direct session-store mutation bypass. |
| Skill Improvement session service -> agent run/grant/store/watcher | Pass | Pass | Pass | Pass | Proper actor-session owner. |
| Built-in bootstrap -> registry/settings | Pass | Pass | Pass | Pass | Startup owns clean-state id materialization. |
| Web -> GraphQL | Pass | Pass | Pass | Pass | Web does not own backend eligibility or persistence policy. |
| No-migration/no-fallback rule | Pass | Pass | Pass | Pass | Explicitly forbids data migration, old-data cleanup routines, startup gates, aliases, and fallback reads for old state. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `SkillImprovementService` | Pass | Pass | Pass | Pass | Governs manual flow. |
| `SkillImprovementImproverSessionService` | Pass | Pass | Pass | Pass | Owns improver run/session reuse/launch/restore and request posting. |
| `AgentWorkTraceProjectionService` | Pass | Pass | Pass | Pass | Skill Improvement calls projection boundary only. |
| `ServerSettingsService` | Pass | Pass | Pass | Pass | New typed methods/keys are planned. |
| `BuiltInAgentBootstrapper` | Pass | Pass | Pass | Pass | Built-in lifecycle remains in built-in subsystem, not Skill Improvement service. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `skillImprovementCapability` / `setSkillImprovementEnabled` | Pass | Pass | Pass | Low | Pass |
| `skillImprovementStrategyCatalog` | Pass | Pass | N/A | Low | Pass |
| Agent-run eligibility/start APIs | Pass | Pass | Pass | Low | Pass |
| Team-member eligibility/start APIs | Pass | Pass | Pass | Low | Pass |
| `getSkillImprovementRunRecord(improvementRunId)` | Pass | Pass | Pass | Low | Pass |
| `SkillImprovementImproverSessionService.activateOrGet` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/skill-improvement/` | Pass | Pass | Low | Pass | Correct capability folder, not actor-only `skill-improver`. |
| `services/improver-session/` | Pass | Pass | Low | Pass | Correct sub-boundary for actor lifecycle. |
| `src/api/graphql/types/skill-improvement*.ts` | Pass | Pass | Low | Pass | Existing transport layout. |
| `built-in-agents` registry/templates | Pass | Pass | Low | Pass | Existing built-in subsystem is extended, not duplicated. |
| `autobyteus-web/components/workspace/skill-improvement/` | Pass | Pass | Low | Pass | Correct UI feature folder. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Work trace generation | Pass | Pass | N/A | Pass | Reuses `agent-work-traces`; no format changes. |
| Built-in Retrospective Skill Improver materialization | Pass | Pass | N/A | Pass | Existing built-in registry/bootstrap is correct owner. |
| Settings persistence | Pass | Pass | N/A | Pass | `ServerSettingsService` extended with new keys/methods. |
| GraphQL transport | Pass | Pass | N/A | Pass | Existing resolver/type/converter pattern. |
| Web state/UI | Pass | Pass | N/A | Pass | Existing Pinia/components/localization are renamed. |
| Old-state conversion | Pass | Pass | N/A | Pass | Correctly not reused/extended because user clarified no data migration. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| GraphQL names | No | Pass | Pass | Old API names removed. |
| Runtime settings/path reads | No | Pass | Pass | New clean-state names only. |
| Source re-export aliases | No | Pass | Pass | Old source folder/barrels removed. |
| Built-in id alias | No | Pass | Pass | Old id not preserved as alias. |
| Data migration / old-data cleanup routines | No | Pass | Pass | Explicitly excluded for this unused development-phase state. |
| Historical old-data cleanup references | Yes, intentionally | Pass | Pass | Allowlist covers historical migration ids/classes/fixtures. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Mechanical source/API/UI rename | Pass | Pass | Pass | Pass |
| Settings/path/record clean-state rename | Pass | Pass | Pass | Pass |
| Built-in id clean-state rename | Pass | Pass | Pass | Pass |
| No app-data migration | Pass | Pass | Pass | Pass |
| Stale-term search/allowlist | Pass | Pass | Pass | Pass |
| Verification guidance | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Top-level folder naming | Yes | Pass | Pass | Pass | Distinguishes capability from actor. |
| Runtime state | Yes | Pass | Pass | Pass | Shows new-only path and rejects fallback. |
| GraphQL rename | Yes | Pass | Pass | Pass | Shows API/field rename and old alias rejection. |
| Built-in id rename | Yes | Pass | Pass | Pass | Shows clean-state default id and rejects old alias. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None blocking. | N/A | N/A | Closed for architecture review. |

## Review Decision

- `Pass`: the design is ready for implementation.

The round 2 design is implementation-ready. The clean-state/no-data-migration scope is now explicit and reconciles the prior migration-related blockers. The design preserves the existing manual Skill Improvement business flow while making stale source/API/UI/runtime names, paths, ids, and docs a first-class removal/rename concern.

## Findings

None.

## Classification

N/A — no unresolved design findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Large mechanical rename may miss generated artifacts, tests, docs, or stale strings.
- Local development machines with old disabled feature data may contain stale settings/files that runtime no longer reads; this is accepted by user clarification.
- GraphQL codegen may require a live backend schema URL; implementation should record if codegen cannot run.
- Historical old-term allowlist must stay narrow so active runtime/UI/API terms do not hide behind it.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Proceed to implementation with the cumulative package. Do not add app-data migration, compatibility aliases, fallback reads, startup gates, or old-data cleanup routines for old development-phase state; do remove/rename stale active code and preserve existing manual Skill Improvement behavior.
