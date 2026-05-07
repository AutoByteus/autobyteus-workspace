# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-catalog-origin-grouping/tickets/done/agent-catalog-origin-grouping/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-catalog-origin-grouping/tickets/done/agent-catalog-origin-grouping/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-catalog-origin-grouping/tickets/done/agent-catalog-origin-grouping/design-spec.md`
- Superseding Identity Rework: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-catalog-origin-grouping/tickets/done/agent-catalog-origin-grouping/identity-rename-rework.md`
- Superseding Built-In-Agent Rework: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-catalog-origin-grouping/tickets/done/agent-catalog-origin-grouping/built-in-agents-refactor-rework.md`
- Current Review Round: 2
- Trigger: User requested that architecture review be performed after reloading shared design principles/common design best practices, despite the prior instruction to skip another review round.
- Prior Review Round Reviewed: Round 1, historical pass for the earlier display-name-only/default-agent design.
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Re-read `architecture-reviewer/SKILL.md`, `design-principles.md`, and `templates/design-review-report-template.md`; reviewed requirements, investigation notes, design spec, `identity-rename-rework.md`, and `built-in-agents-refactor-rework.md`; spot-checked current code paths for the newly proposed built-in-agent subsystem: `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts`, `autobyteus-server-ts/src/built-in-agents/built-in-agent-bootstrapper.ts`, `autobyteus-server-ts/src/server-runtime.ts`, asset copy/smoke scripts, and remaining old bootstrapper test paths.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial solution-designer handoff | N/A | None | Pass | No | Superseded for default-agent identity; it assumed/recorded an older narrower backend seed-owner shape. |
| 2 | User-requested review after identity and built-in-agent superseding rework | Round 1 had no unresolved findings; its identity/backend seed-owner basis is now obsolete. | AR-001, AR-002 | Fail | Yes | The new built-in-agent refactor is directionally sound, but the canonical design package is internally inconsistent and missing updated design-health/spine/file-mapping coverage. |

## Reviewed Design Spec

The cumulative package now contains two superseding corrections:

1. The default featured agent identity must canonicalize to `daily-assistant`; `autobyteus-super-assistant` is legacy migration input only.
2. Platform-provided built-in agent templates/seeding for Daily Assistant and Memory Compactor should move into one server built-in-agent subsystem, with a registry and unified bootstrapper.

The second correction is the architecturally significant change. It turns the backend part from a narrow Daily Assistant bootstrapper rename into a broader ownership/refactor task: centralize built-in-agent provisioning and remove scattered one-off bootstrappers/templates.

The rework direction is sound, but the canonical `design-spec.md` still contains many stale sections that allocate backend seed lifecycle to `DefaultDailyAssistantBootstrapper` and `agent-definition/default-agents/daily-assistant`, while the superseding rework requires `src/built-in-agents`, a registry, and `bootstrapBuiltInAgents`. That makes the package not implementation-ready as an architecture artifact.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Fail | `design-spec.md` still classifies the backend work as a small targeted extraction/refactor around `DefaultDailyAssistantBootstrapper`. The new user-directed built-in-agent refactor identifies a broader platform built-in-agent ownership issue involving Daily Assistant and Memory Compactor. | Update the task design health assessment to include the built-in-agent subsystem refactor. |
| Root-cause classification is explicit and evidence-backed | Fail | The spec still says no major backend design issue except bounded seed migration. `built-in-agents-refactor-rework.md` explicitly identifies scattered platform built-in templates/seeding across `agent-definition/default-agents` and `agent-execution/compaction` as a design issue. | Classify the backend root cause, likely `File Placement Or Responsibility Drift` plus `Boundary Or Ownership Issue`, with current-code evidence. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Fail | The superseding rework says refactor is needed now, but the design spec still treats unified built-in-agent placement as a top-note addendum while its body maps old one-off files. | Record the built-in-agent refactor as in-scope and required now. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Fail | Spine inventory, ownership map, subsystem allocation, file mapping, dependency rules, interface mapping, examples, and validation commands still describe `DefaultDailyAssistantBootstrapper` / `default-agents` rather than the unified built-in-agent subsystem. | Integrate the rework through all concrete design sections. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | Superseded by new user direction | Round 1 had no blocking findings, but its default-agent identity/backend seed lifecycle assumptions are no longer authoritative. | No reused finding IDs. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | `/agents` no-search render to grouped cards | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Search input to flat results | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Server startup to default featured Daily Assistant | Fail | Fail | Fail | Fail | Fail | Fail | Fail |
| DS-004 | Card action return/event path | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Pure local grouping transformation | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| Missing DS-006 | Unified built-in-agent provisioning for Daily Assistant and Memory Compactor | Fail | Fail | Fail | Fail | Fail | Fail | Fail |

Notes: the design needs a backend spine such as `server-runtime -> bootstrapBuiltInAgents -> built-in-agent registry -> template materialization/migration -> AgentDefinitionService resolution -> settings initialization/migration -> cache refresh`, plus explicit per-agent setting effects for featured catalog and compaction agent setting.

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend agent management page | Pass | Pass | Pass | Pass | Grouping path remains sound. |
| Frontend catalog utilities | Pass | Pass | Pass | Pass | Origin grouping helper remains sound. |
| Frontend ownership formatting utilities | Pass | Pass | Pass | Pass | Shared normalization remains sound. |
| Backend default agent seeds | Fail | Fail | Fail | Fail | This subsystem allocation is stale; superseding design requires a broader `built-in-agents` subsystem. |
| Backend built-in-agent provisioning | Fail | Pass | Fail | Fail | Direction is sound in the rework artifact, but it is not integrated into the canonical spec tables/spines. |
| Backend settings | Pass | Pass | Fail | Fail | Design must include both featured catalog setting migration and compaction agent setting initialization under the unified built-in bootstrapper. |
| Validation/tests | Fail | Pass | Fail | Fail | Validation commands still reference old Daily-only paths and omit required unified built-in tests/removal checks. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Ownership scope normalization | Pass | Pass | Pass | Pass | Frontend grouping remains sound. |
| Origin section/group shape | Pass | Pass | Pass | Pass | Frontend grouping remains sound. |
| Built-in agent registry | Pass | Pass | Pass | Pass | The rework artifact proposes a tight registry shape with id/template/display/settings/legacy metadata. |
| Built-in agent bootstrap result shape | Pass | Pass | Pass | Pass | A testable result is identified, but the canonical spec should include final fields/owners. |
| Legacy seed fingerprint(s) | Pass | Pass | Pass | Pass | Daily Assistant legacy hash is correctly scoped to migration. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentDefinitionOriginGroup` / sections | Pass | Pass | Pass | Pass | Pass | Frontend shape remains tight. |
| `BuiltInAgentDefinition` | Pass | Pass | Pass | Pass | Pass | Registry shape is appropriate; per-agent `settingDefault` variants are explicit. |
| Canonical vs legacy agent identity | Pass | Pass | Pass | N/A | Pass | `daily-assistant` canonical / `autobyteus-super-assistant` legacy is now clear in rework. |
| Backend source-path representation in canonical spec | Fail | Fail | Fail | N/A | Fail | Spec still has overlapping old path representation: `default-agents/daily-assistant` vs `built-in-agents/templates/daily-assistant`. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| No-search regular `All agents` path | Pass | Pass | Pass | Pass | Frontend removal remains clear. |
| Old `autobyteus-super-assistant` active identity | Pass | Pass | Pass | Pass | Rework makes it legacy input only. |
| `DefaultDailyAssistantBootstrapper` / Daily-only seed owner | Fail | Pass | Fail | Fail | Rework says remove one-off bootstrappers, but design spec still maps this as the backend owner. |
| `DefaultCompactorAgentBootstrapper` / compaction-owned template owner | Pass | Pass | Pass | Pass | Rework names this removal clearly; integrate it into the canonical design spec. |
| Old scattered template folders | Pass | Pass | Fail | Fail | Rework names moves; design spec folder mapping still records the old Daily Assistant default-agent path. |
| Old tests/smoke scripts | Pass | Pass | Fail | Fail | Design must name active old bootstrapper tests/smokes to remove/replace and update validation commands. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/catalog/agentDefinitionOriginGroups.ts` | Pass | Pass | Pass | Pass | Frontend grouping owner remains correct. |
| `autobyteus-web/utils/definitionOwnership.ts` | Pass | Pass | Pass | Pass | Ownership utility remains correct. |
| `autobyteus-web/components/agents/AgentList.vue` | Pass | Pass | Pass | Pass | Page composition remains correct. |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` | Pass | Pass | Pass | Pass | Correct proposed registry owner. |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-bootstrapper.ts` | Pass | Pass | Pass | Pass | Correct proposed unified lifecycle owner. |
| `autobyteus-server-ts/src/built-in-agents/templates/*` | Pass | Pass | N/A | Pass | Correct proposed template placement. |
| `autobyteus-server-ts/src/agent-definition/default-agents/default-daily-assistant-bootstrapper.ts` | Fail | Fail | Fail | Fail | Stale one-off owner in design spec; should be removed/replaced by unified bootstrapper. |
| `autobyteus-server-ts/src/agent-definition/default-agents/daily-assistant/*` | Fail | Fail | Fail | Fail | Stale template path in design spec; should move under `src/built-in-agents/templates/daily-assistant`. |
| `autobyteus-server-ts/src/agent-execution/compaction/default-compactor-agent-bootstrapper.ts` | Pass | Fail | Fail | Fail | Rework correctly rejects this owner; canonical spec must remove it from active path assumptions. |
| Backend built-in tests/smoke scripts | Fail | Fail | Fail | Fail | Spec must replace Daily-only and compaction-only test owners with unified built-in-agent tests/smoke coverage. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend grouping boundaries | Pass | Pass | Pass | Pass | Still sound. |
| `built-in-agents` subsystem | Pass | Pass | Pass | Pass | Rework direction is sound: runtime calls one bootstrapper; compaction runtime reads setting, not template internals. |
| Canonical `design-spec.md` backend dependency rules | Fail | Fail | Fail | Fail | Still allow/name `DefaultDailyAssistantBootstrapper` instead of `bootstrapBuiltInAgents`; omit Memory Compactor setting path. |
| Compaction runtime boundary | Pass | Pass | Pass | Pass | Rework correctly says compaction runtime depends on selected agent id only. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentDefinition` GraphQL/query boundary | Pass | Pass | Pass | Pass | No schema change needed. |
| `featuredCatalogItems.ts` | Pass | Pass | Pass | Pass | Still owns featured parsing/splitting. |
| `agentDefinitionOriginGroups.ts` | Pass | Pass | Pass | Pass | Still owns regular origin grouping. |
| `built-in-agents` subsystem | Pass | Pass | Pass | Pass | Proposed public entrypoint should be `bootstrapBuiltInAgents`. |
| `DefaultDailyAssistantBootstrapper` in spec | Fail | Fail | Fail | Fail | Stale boundary competes with the new unified built-in-agent boundary. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `GetAgentDefinitions` | Pass | Pass | Pass | Low | Pass |
| `splitFeaturedCatalogDefinitions(items, 'AGENT', definitions)` | Pass | Pass | Pass | Low | Pass |
| `buildAgentDefinitionOriginSections(regularDefinitions)` | Pass | Pass | Pass | Low | Pass |
| `normalizeDefinitionOwnershipScope(recordOrValue)` | Pass | Pass | Pass | Low | Pass |
| `bootstrapBuiltInAgents(options?)` | Pass | Pass | Pass | Low | Pass |
| `bootstrapDefaultDailyAssistant(options?)` | Fail | Fail | Pass | Medium | Fail |
| Compaction setting selection (`AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`) | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/agents` | Pass | Pass | Low | Pass | Frontend UI owner. |
| `autobyteus-web/utils/catalog` | Pass | Pass | Low | Pass | Frontend catalog display utility owner. |
| `autobyteus-server-ts/src/built-in-agents` | Pass | Pass | Low | Pass | Correct centralized backend owner. |
| `autobyteus-server-ts/src/agent-definition/default-agents` | Fail | Fail | Medium | Fail | Stale for platform built-in templates after superseding rework. |
| `autobyteus-server-ts/src/agent-execution/compaction/default-compactor-agent*` | Fail | Fail | Medium | Fail | Stale for platform built-in template/seeding lifecycle; compaction execution should not own seed templates. |
| `autobyteus-server-ts/scripts` | Pass | Pass | Low | Pass | Build/smoke validation remains appropriate, but script names/targets must update to built-in-agent smoke. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Featured de-duplication | Pass | Pass | N/A | Pass | Reuse remains correct. |
| Origin grouping | Pass | Pass | Pass | Pass | New frontend helper remains justified. |
| Default platform agent seeding | Pass | Fail | Pass | Fail | The new support piece should be unified built-in-agent seeding, not Daily-only seeding. |
| Memory Compactor template/seeding | Pass | Pass | Pass | Pass | User-identified design issue justifies moving it under built-in-agent subsystem. |
| Template asset packaging | Pass | Pass | N/A | Pass | Copy all built-in templates from one directory. |
| Durable docs | Pass | Pass | N/A | Pass | Docs must reflect both grouped Agents page and built-in-agent identity/provisioning. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| No-search regular list | No | Pass | Pass | Replaced by origin sections. |
| `autobyteus-super-assistant` identity | Yes, as migration input only | Pass | Pass | Acceptable bounded migration, not active alias. |
| Daily-only bootstrapper after built-in refactor | Yes, if left active | Fail | Fail | Must be removed/replaced; current spec still names it. |
| Compaction-owned template/bootstrapper after built-in refactor | Yes, if left active | Pass | Pass | Rework rejects it; integrate removal into canonical spec. |
| User-edited built-in agent files | Yes | Pass | Pass | Preservation is required and acceptable. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Frontend grouping | Pass | Pass | Pass | Pass |
| Daily Assistant canonical id migration | Pass | Pass | Pass | Pass |
| Unified built-in-agent subsystem migration | Fail | Fail | Fail | Fail |
| Memory Compactor move to built-in templates | Pass | Fail | Fail | Fail |
| Settings initialization/migration across built-ins | Fail | Fail | Fail | Fail |
| Validation/docs after built-in refactor | Fail | Fail | Fail | Fail |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| No-search grouping order | Yes | Pass | Pass | Pass | Clear. |
| Team-local group with app context | Yes | Pass | Pass | Pass | Clear. |
| Daily identity migration | Yes | Pass | Pass | Pass | Clear in `identity-rename-rework.md`. |
| Unified built-in-agent subsystem | Yes | Pass | Pass | Pass | Clear in `built-in-agents-refactor-rework.md`, but not integrated into `design-spec.md`. |
| Migration sequence from old one-off bootstrappers to unified bootstrapper | Yes | Fail | Pass | Fail | Required moves are listed, but the canonical design spec still gives old sequence/paths. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Canonical design-health classification for built-in-agent refactor | The new user request identifies an architecture issue, not only a rename. | Update design spec assessment with root cause and refactor posture. | Blocking. |
| Unified built-in-agent startup spine | Implementation needs one authoritative backend flow. | Replace Daily-only DS-003 with built-in registry/bootstrapper spine and per-agent setting effects. | Blocking. |
| Memory Compactor requirements/acceptance in canonical requirements | Built-in-agent refactor expands scope beyond Daily Assistant. | Add or reference explicit FR/AC for Memory Compactor template move, default compaction setting initialization, user-edit preservation, and old one-off removal. | Blocking unless the rework artifact is made authoritative in requirements. |
| Active old one-off tests/smokes cleanup | Leaving old tests/smokes causes validation ambiguity and likely failures. | Design must name replacement test/smoke files and removal expectations. | Blocking for implementation handoff clarity. |

## Review Decision

Fail: the frontend grouping and `daily-assistant` identity direction are sound, and the proposed built-in-agent subsystem is the right architectural direction. However, the cumulative design package is not implementation-ready because the canonical design spec still encodes the stale Daily-only bootstrapper/default-agent path instead of integrating the superseding built-in-agent refactor.

## Findings

### AR-001 — Canonical design spec still uses stale Daily-only backend owner after built-in-agent refactor

- Type: Design Impact
- Severity: Blocking
- Evidence:
  - `built-in-agents-refactor-rework.md` requires one `autobyteus-server-ts/src/built-in-agents/` subsystem with registry, unified bootstrapper, and templates for Daily Assistant and Memory Compactor.
  - `design-spec.md` still maps the backend seed lifecycle to `DefaultDailyAssistantBootstrapper`, `agent-definition/default-agents/daily-assistant`, and Daily-only tests/smoke commands in spine, ownership, boundary, file mapping, and migration sections.
  - This violates the shared design principle that file placement follows ownership and that callers should use one authoritative boundary rather than a stale one-off boundary plus a new outer subsystem.
- Required update:
  - Integrate `built-in-agents-refactor-rework.md` into `design-spec.md` as the canonical backend design.
  - Replace `DefaultDailyAssistantBootstrapper`/`bootstrapDefaultDailyAssistant` with `BuiltInAgentBootstrapper`/`bootstrapBuiltInAgents` in spines, ownership map, boundary map, dependency rules, interface map, file mapping, migration sequence, examples, and validation commands.
  - Move canonical template paths in the spec to `autobyteus-server-ts/src/built-in-agents/templates/{daily-assistant,memory-compactor}/`.
- Recommended recipient: `solution_designer`

### AR-002 — Requirements/design-health coverage does not yet reflect the expanded built-in-agent refactor scope

- Type: Requirement Gap / Design Impact
- Severity: Blocking
- Evidence:
  - Requirements and design have top-level superseding notes for built-in-agent centralization, but the main FR/AC and task design health assessment remain focused on Agents page grouping plus Daily Assistant identity migration.
  - The user-identified design issue includes Memory Compactor template/seeding ownership, compaction setting default initialization, removal of one-off compactor bootstrapper/template ownership, unified template asset packaging, and validation that both built-in agents are seeded from the registry.
  - The current design-health assessment still says “small targeted extraction/refactor” and does not classify the built-in-agent scatter as `File Placement Or Responsibility Drift` or `Boundary Or Ownership Issue`.
- Required update:
  - Add explicit in-scope requirements/acceptance or an authoritative requirements addendum for built-in-agent centralization.
  - Update the task design health assessment and root-cause classification for the backend refactor.
  - Name required decommission/removal of old one-off files/tests/smokes and the replacement validation targets.
- Recommended recipient: `solution_designer`

## Classification

Design Impact, with a related Requirement Gap for the expanded built-in-agent refactor scope.

## Recommended Recipient

`solution_designer`

## Residual Risks

- If implementation proceeds from the split/superseding artifacts without an integrated design spec, implementers may mix the stale Daily-only bootstrapper path with the new unified built-in-agent subsystem.
- Active old one-off tests/smoke paths can remain after the move if removal is not named in the canonical migration sequence.
- Memory Compactor settings behavior must remain a normal compaction-runtime setting selection, while template/seeding moves to the built-in-agent subsystem; this boundary should be explicit to avoid compaction runtime owning provisioning again.

## Latest Authoritative Result

- Review Decision: Fail
- Notes: Revise the design package before using it as the authoritative implementation guide. The built-in-agent refactor direction itself is sound; the failure is that the canonical design spec and requirements are not yet fully reconciled with that superseding direction.
