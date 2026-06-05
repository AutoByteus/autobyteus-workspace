# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/in-progress/self-evolving-harness-feasibility/requirements-doc.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/in-progress/self-evolving-harness-feasibility/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/in-progress/self-evolving-harness-feasibility/design-spec.md`
- Current Review Round: 5
- Trigger: Narrow re-review after `solution_designer` reworked round-4 findings AR-002 and AR-004.
- Prior Review Round Reviewed: 4
- Latest Authoritative Round: 5
- Current-State Evidence Basis:
  - Reloaded current artifacts from disk before review; this report reflects the current files, not cached round-4 text.
  - Reloaded artifact hashes at review time:
    - Requirements: `7c956c1f8b8eeb4696d45b6c53acc10af90385f1fddd538886f53ebc1012ecf4`
    - Investigation notes: `39f3901d27b471baf4b082e171d12c87785d97029bc33711a0bf94a92e712b14`
    - Design spec: `bbe42ae065e96e723a2171f6c1ad748a1d713af8b7ca8daa0bdef3604bd61f7d`
  - Focused verification was run for the previously blocking contradiction patterns: start-time config override, agent/team definition config precedence, raw trace path retention, stale change-recorder/metrics design references.
  - Current implementation files in the branch may still reflect older directions; implementation must treat this design package and this review as authoritative over earlier implementation handoff/code-review artifacts.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review | N/A | AR-001, AR-002, AR-003 | Fail | No | Missing metrics/benefit spine, unclear config precedence, and missing concrete manual trigger strategy. |
| 2 | Revised design after round 1 | AR-001, AR-002, AR-003 | 0 | Pass | No | Passed at that time, later superseded by runtime/run-config ownership correction. |
| 3 | User-corrected runtime/run-config ownership | AR-001, AR-002, AR-003 | 0 | Pass | No | Passed at that time, later superseded by skill-root target, anonymized evidence, and MVP simplification changes. |
| 4 | Fresh full review of latest revised design | AR-001, AR-002, AR-003 | AR-004 | Fail | No | AR-002 reopened for stale config/interface guidance; AR-004 added for raw trace path retention. |
| 5 | Narrow rework for AR-002/AR-004 | AR-002, AR-004 | 0 | Pass | Yes | Blocking contradictions are resolved; design is ready for implementation rework. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/in-progress/self-evolving-harness-feasibility/design-spec.md` after the narrow rework.

Accepted current design direction:

- Self-evolution is runtime/run-launch configuration plus run/member metadata snapshots, not an `AgentDefinition` or `TeamDefinition` attribute.
- Manual start commands read the existing metadata snapshot; they do not accept a config override.
- The evolver target is one or more configured skill folders/packages, with exact editable skill roots and primary `SKILL.md` paths.
- Prompt-facing evidence is an anonymized, human-readable work-history digest owned by `SelfEvolutionWorkHistoryProjector` / `SelfEvolutionEvidenceBuilder`.
- The MVP uses a visible single-agent evolver run with `run_bash` and `autoExecuteTools: true`.
- The MVP intentionally has no dedicated change-recorder/audit service and no dedicated metrics/reporting service.
- Default MVP provenance is minimal and does not retain raw trace paths.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The design classifies this as a bounded MVP feature with explicit direct-edit risk acceptance and strategy placeholders for future work. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | The design identifies the boundary bridge: run evidence -> configured skill roots -> visible helper run -> target notification. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Required now: self-evolution subsystem, run-launch config/snapshot support, skill-root resolver, anonymized work-history projector, built-in evolver bootstrap. Deferred: scheduled/signal triggers, agent-team evolver, audit/metrics, exact historical skill binding snapshots. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Data-flow spines, ownership tables, domain contracts, file mapping, interface boundary mapping, and implementation guidance are aligned after AR-002/AR-004 cleanup. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-001 | Blocking | Obsolete by approved scope simplification | Requirements and design now explicitly remove dedicated MVP metrics/reporting while preserving harness-updating vs harness-benefit as future evaluation guidance. | No open action. |
| 1 | AR-002 | Blocking, reopened in round 4 | Resolved | Interface mapping now says `startAgentRunSelfEvolution(input)` accepts `runId` only and no config override. Interface boundary check now says only standalone/team/member run-launch APIs may carry `selfEvolution`; agent/team definition update surfaces must not carry it. Concrete example now uses `default disabled -> run-launch override -> run metadata snapshot`. | No open action. |
| 1 | AR-003 | Blocking | Resolved | `ManualTriggerStrategy.createRequest(...)` and canonical `SelfEvolutionRequest` remain in the design; scheduled/signal strategies remain non-executable placeholders. | No open action. |
| 4 | AR-004 | Blocking | Resolved | `SelfEvolutionEvidencePackage` no longer contains `runMetadataPath` or raw trace path fields. Evidence/privacy and implementation guidance now say raw trace paths must not be retained in the default MVP evidence package or evolution record. | No open action. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Capability / visibility | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Standalone manual self-evolution | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Team member manual self-evolution | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Built-in evolver bootstrap | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Evolver completion / minimal record / notification | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Manual trigger request | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 | Effective run-config snapshot | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `self-evolution` | Pass | Pass | Pass | Pass | Correct owner for orchestration, strategy catalog, trigger strategy, evidence building, run record, and notification. |
| `agent-execution` | Pass | Pass | Pass | Pass | `AgentRunConfig.selfEvolution` and `AgentRunMetadata.selfEvolutionEffective` are the right standalone run surfaces. |
| `agent-team-execution` / team run metadata | Pass | Pass | Pass | Pass | `TeamRunConfig.selfEvolution`, optional current member-run launch override, and member metadata snapshot are the right team surfaces. |
| `agent-definition` / `agent-team-definition` | Pass | Pass | Pass | Pass | Definitions are sources for target identity and configured skill names only; no MVP self-evolution config fields. |
| `skills` | Pass | Pass | Pass | Pass | Reusing configured skill resolution and then canonicalizing exact skill roots is sound. |
| `run-history` / memory projection | Pass | Pass | Pass | Pass | Existing projection/raw memory can be an input source; only anonymized digest/minimal linkage is default evidence/provenance output. |
| frontend run-launch / run-detail UI | Pass | Pass | Pass | Pass | Launch surfaces own config; run detail is read-only for config and only starts from snapshots. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Effective config resolution | Pass | Pass | Pass | Pass | One resolver owns launch-time snapshot precedence. |
| Manual trigger request creation | Pass | Pass | Pass | Pass | `ManualTriggerStrategy` avoids resolver/service ad hoc request construction. |
| Skill target resolution | Pass | Pass | Pass | Pass | Resolver owns exact skill root and `SKILL.md` paths. |
| Work-history projection | Pass | Pass | Pass | Pass | Projector is the right owner for anonymized prompt-facing evidence. |
| Minimal run record / provenance | Pass | Pass | Pass | Pass | Record no longer carries change metrics, diffs, audits, or raw trace path references. |
| Strategy catalog descriptors | Pass | Pass | Pass | Pass | Implemented/not-implemented statuses are explicit and safe. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `SelfEvolutionRunConfigOverride` | Pass | Pass | Pass | Pass | Pass | Runtime launch override only. |
| `SelfEvolutionEffectiveConfig` | Pass | Pass | Pass | Pass | Pass | Complete snapshot used by eligibility and start. |
| `ManualSelfEvolutionTriggerInput` | Pass | Pass | Pass | Pass | Pass | Carries target identity/request metadata, not config override. |
| `SelfEvolutionRequest` | Pass | Pass | Pass | Pass | Pass | Canonical request from trigger strategy to service. |
| `SelfEvolutionEvidencePackage` | Pass | Pass | Pass | N/A | Pass | Contains target/source linkage, anonymized work history, feedback signals, and privacy warnings only. |
| `SelfEvolutionRunRecord` | Pass | Pass | Pass | N/A | Pass | Minimal provenance plus status/notification only; no raw trace paths or change/metrics fields. |
| `SelfEvolutionSkillTarget` | Pass | Pass | Pass | Pass | Pass | Exact editable root plus primary file; not only `SKILL.md`. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Definition-owned `selfEvolution` fields | Pass | Pass | Pass | Pass | Do not add to agent/team definitions or definition update inputs. |
| Start-mutation config overrides | Pass | Pass | Pass | Pass | Manual start uses existing metadata snapshot only. |
| Dedicated change recorder / git auditor | Pass | N/A | Pass | Pass | Removed from MVP design; current stale implementation must be cleaned accordingly. |
| Dedicated metrics/reporting service | Pass | N/A | Pass | Pass | Removed from MVP design; current stale implementation/docs/tests must be cleaned accordingly. |
| Raw trace path evidence/provenance retention | Pass | Pass | Pass | Pass | Removed from default MVP evidence package and evolution record. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/self-evolution/services/self-evolution-service.ts` | Pass | Pass | Pass | Pass | Orchestrates lifecycle and sequencing. |
| `src/self-evolution/services/self-evolution-effective-config-resolver.ts` | Pass | Pass | Pass | Pass | Owns launch-time effective snapshot precedence. |
| `src/self-evolution/services/triggers/manual-trigger-strategy.ts` | Pass | Pass | Pass | Pass | Owns manual trigger request creation. |
| `src/self-evolution/services/self-evolution-skill-target-resolver.ts` | Pass | Pass | Pass | Pass | Owns exact editable skill target resolution. |
| `src/self-evolution/services/self-evolution-work-history-projector.ts` | Pass | Pass | Pass | Pass | Owns anonymized work-history rendering. |
| `src/self-evolution/services/self-evolution-evidence-builder.ts` | Pass | Pass | Pass | Pass | Composes projector output and minimal source linkage without retaining raw trace paths. |
| `src/self-evolution/services/self-evolution-run-store.ts` | Pass | Pass | Pass | Pass | Persists minimal evolution records. |
| `src/self-evolution/services/self-evolution-change-recorder.ts` / git auditor | Pass | N/A | Pass | Pass | Should be absent or removed from final MVP implementation. |
| `src/self-evolution/services/self-evolution-metrics-service.ts` | Pass | N/A | Pass | Pass | Should be absent or removed from final MVP implementation. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `SelfEvolutionService` | Pass | Pass | Pass | Pass | Uses owned services/resolvers; GraphQL does not bypass trigger strategy. |
| `SelfEvolutionEffectiveConfigResolver` | Pass | Pass | Pass | Pass | No agent/team definition config source in MVP. |
| `SelfEvolutionEvidenceBuilder` / `SelfEvolutionWorkHistoryProjector` | Pass | Pass | Pass | Pass | Raw traces can be read as source material, but raw trace JSON/paths are not default prompt/evidence/provenance output. |
| Evolver direct edit | Pass | Pass | Pass | Pass | Prompt directs edits only inside exact skill roots. |
| Agent/team definitions | Pass | Pass | Pass | Pass | Self-evolver must not edit definitions or definition config. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Capability boundary | Pass | Pass | Pass | Pass | Typed capability remains authoritative over generic settings reads. |
| Start self-evolution boundary | Pass | Pass | Pass | Pass | Explicit standalone/team member starts with no generic target selector and no config override. |
| Run-launch config boundary | Pass | Pass | Pass | Pass | Run launch owns opt-in config; run detail only reads snapshots. |
| Skill edit boundary | Pass | Pass | Pass | Pass | Skill roots are the editable package boundaries. |
| Evidence/privacy boundary | Pass | Pass | Pass | Pass | Work-history digest is prompt-facing; raw trace paths are not retained in MVP records. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `selfEvolutionCapability()` | Pass | Pass | Pass | Low | Pass |
| `setSelfEvolutionEnabled(enabled)` | Pass | Pass | Pass | Low | Pass |
| `selfEvolutionStrategyCatalog()` | Pass | Pass | Pass | Low | Pass |
| `getAgentRunSelfEvolutionEligibility(runId)` | Pass | Pass | Pass | Low | Pass |
| `getTeamMemberSelfEvolutionEligibility(teamRunId, memberRunId)` | Pass | Pass | Pass | Low | Pass |
| `startAgentRunSelfEvolution(input)` | Pass | Pass | Pass | Low | Pass |
| `startTeamMemberSelfEvolution(input)` | Pass | Pass | Pass | Low | Pass |
| Agent/team definition update inputs | Pass | Pass | Pass | Low | Pass |
| Standalone/team/member run launch inputs | Pass | Pass | Pass | Low | Pass |
| `getSelfEvolutionRunRecord(evolutionRunId)` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/self-evolution` | Pass | Pass | Low | Pass | Correct subsystem for control-plane feature. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-config.ts` | Pass | Pass | Low | Pass | Correct standalone launch surface. |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-config.ts` | Pass | Pass | Medium | Pass | Correct team/member launch surface. |
| `autobyteus-server-ts/src/run-history/store/*metadata-types.ts` | Pass | Pass | Low | Pass | Correct snapshot persistence surface. |
| `autobyteus-server-ts/src/agent-definition` / `agent-team-definition` | Pass | Pass | Low | Pass | No self-evolution config ownership. |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-work-history-projector.ts` | Pass | Pass | Low | Pass | Correct evidence projection boundary. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Visible helper run launch | Pass | Pass | Pass | Pass | Compaction-style helper run reuse is sound. |
| Skill resolution | Pass | Pass | Pass | Pass | `SkillService.resolveConfiguredSkillsForAgent` is the right bridge. |
| Work-history digest | Pass | Pass | Pass | Pass | Compaction prompt-builder pattern supports a specialized projector. |
| Feature gating | Pass | Pass | Pass | Pass | Typed capability boundary is sound. |
| Git/manual rollback | Pass | Pass | N/A | Pass | Accepted external inspection/revert surface for MVP. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Old runs without `selfEvolutionEffective` | No | Pass | Pass | Treat as ineligible. |
| Old agent/team definitions without `selfEvolution` | No | Pass | Pass | Leave unchanged; no new definition field. |
| Definition-owned `selfEvolution` from stale implementation/design | Yes in current branch history | Pass | Pass | Remove from implementation; not in current design. |
| Metrics/change-recorder implementation from earlier round | Yes in current branch | Pass | Pass | Remove or abandon stale code/tests/docs according to current design. |
| Raw trace path debug references | No in current design | Pass | Pass | Future debug/admin mode requires separate design. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Move config to run-launch/metadata only | Pass | Pass | Pass | Pass |
| Skill-root target resolver | Pass | Pass | Pass | Pass |
| Work-history projector | Pass | Pass | Pass | Pass |
| Remove metrics/change recorder | Pass | Pass | Pass | Pass |
| Remove raw trace path retention | Pass | Pass | Pass | Pass |
| Update frontend launch/run detail surfaces | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Standalone start API | Yes | Pass | Pass | Pass | Start is `runId` only. |
| Team member API | Yes | Pass | Pass | Pass | Explicit `teamRunId + memberRunId`. |
| Direct edit task prompt | Yes | Pass | Pass | Pass | Exact skill root boundary is clear. |
| Strategy catalog | Yes | Pass | Pass | Pass | Not-implemented descriptors are explicit. |
| Evolver run config | Yes | Pass | Pass | Pass | `run_bash`, auto-exec, compaction fallback. |
| Feature gate | Yes | Pass | Pass | Pass | Typed capability is clear. |
| Config precedence | Yes | Pass | Pass | Pass | Now correctly says `default disabled -> run-launch override -> run metadata snapshot`. |
| Team-run config | Yes | Pass | Pass | Pass | Rejects `TeamDefinition.selfEvolution`. |
| Manual trigger | Yes | Pass | Pass | Pass | Trigger strategy example is clear. |
| Evidence/provenance | Yes | Pass | Pass | Pass | Now excludes raw trace path retention from MVP evidence/provenance. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None blocking | Current MVP scope is intentionally bounded and implementation-ready. | N/A | Closed. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no open findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

Accepted/deferred risks to carry into implementation and validation:

- Direct `run_bash` edits can produce invalid, overfit, or off-target skill content. MVP accepts visible helper run plus manual Git inspection/revert instead of service-mediated patch validation.
- Active target notification/reload is best-effort; next-run correctness remains the MVP baseline.
- Exact historical skill binding snapshots at original target run start are deferred; MVP resolves current configured skill roots at evolution time and records that limitation.
- Non-Git skill roots are allowed with warnings/manual rollback expectations unless implementation chooses stricter gating.
- Benefit measurement is future work; UI must not imply that helper-run completion proves improvement.
- Existing branch code and earlier downstream artifacts may still reflect stale round-2/round-3 implementation choices; implementation must reconcile them to the current design.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: AR-002 and AR-004 are resolved. The revised self-evolution MVP design is implementation-ready.
