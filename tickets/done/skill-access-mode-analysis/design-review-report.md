# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-access-mode-analysis/tickets/in-progress/skill-access-mode-analysis/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-access-mode-analysis/tickets/in-progress/skill-access-mode-analysis/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-access-mode-analysis/tickets/in-progress/skill-access-mode-analysis/design-spec.md`
- Current Review Round: 1
- Trigger: Initial architecture review requested by `solution_designer` for Skill Access / `GLOBAL_DISCOVERY` removal.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Reviewed the three upstream artifacts and independently inspected the current code paths for `SkillAccessMode`, `resolveSkillAccessMode`, AutoByteus prompt injection, skill tools, launch forms/defaults, team member config propagation, GraphQL enum/input surfaces, metadata parsing/migration framework, external channel presets, SDK contracts, and application run binding normalization.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review | N/A | No | Pass | Yes | Design is actionable; residual risks are implementation checklist items, not design blockers. |

## Reviewed Design Spec

Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-access-mode-analysis/tickets/in-progress/skill-access-mode-analysis/design-spec.md`

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design classifies this as Behavior Change / Product Cleanup / Boundary Refactor. | None |
| Root-cause classification is explicit and evidence-backed | Pass | Root cause is `Boundary Or Ownership Issue plus Duplicated Policy Or Coordination`, backed by evidence from launch UI, resolver fallback, runtime semantic drift, tool bypasses, and persistence. | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor needed now: yes; full `skillAccessMode` field deletion deferred with named residual risk. | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Removal plan, spine inventory, file mapping, dependency rules, and migration sequence all reflect the boundary refactor. | None |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First review round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Single-agent launch to runtime exposure | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Team launch to member runtime exposure | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Runtime skill tool call authorization | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Persisted legacy value migration | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Channel binding setup preset | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend launch configuration | Pass | Pass | Pass | Pass | Correctly removes user-facing access policy rather than relabeling it. |
| External channel setup | Pass | Pass | Pass | Pass | Correctly treats saved launch presets as configured-only plumbing. |
| Runtime shared context | Pass | Pass | Pass | Pass | Correctly removes global enum/fallback while allowing internal `NONE` if still needed. |
| Runtime prompt/materialization | Pass | Pass | Pass | Pass | Correctly blocks all-registry prompt/materialization behavior. |
| Agent skill tools | Pass | Pass | Pass | Pass | Correctly extends `skill-tool-access.ts` as policy owner. |
| GraphQL/API contracts | Pass | Pass | Pass | Pass | Generated type drift is called out and included in sequence. |
| Run history / metadata | Pass | Pass | Pass | Pass | Migration is first-class; parsers should not become compatibility wrappers. |
| App SDK contracts | Pass | Pass | Pass | Pass | Breaking cleanup is explicit and product-approved. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Skill access enum/resolver | Pass | Pass | Pass | Pass | Central shared runtime source is the correct owner. |
| Runtime skill authorization | Pass | Pass | Pass | Pass | Central policy helper avoids per-tool drift. |
| Migration JSON rewrite helpers | Pass | Pass | Pass | Pass | Keeping helpers local to the migration is appropriate unless implementation finds broader reuse. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `SkillAccessMode` | Pass | Pass | Pass | N/A | Pass | Global value is removed; remaining configured-only/no-skill semantics are explicitly internal/plumbing. |
| `AgentDefinition.skillNames` | Pass | Pass | Pass | N/A | Pass | Becomes authoritative execution allowlist. |
| Channel binding launch preset | Pass | Pass | Pass | N/A | Pass | User selection removed; retained field, if any, defaults configured-only. |
| Run/team metadata skill mode | Pass | Pass | Pass | N/A | Pass | Migration plus strict parsing controls old global values. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `SkillAccessMode.GLOBAL_DISCOVERY` | Pass | Pass | Pass | Pass | Remove from enum, contracts, generated types, labels, branches, tests. |
| Zero-skill global fallback | Pass | Pass | Pass | Pass | Replacement is configured-only/no-skill behavior, never all-installed. |
| Agent/team/channel `Skill Access` UI controls | Pass | Pass | Pass | Pass | All normal user-facing launch surfaces are named. |
| AutoByteus global prompt branch | Pass | Pass | Pass | Pass | Replacement is configured-only prompt injection. |
| Skill tool bypasses | Pass | Pass | Pass | Pass | `load_skill`, `get_available_skills`, and `get_skill_content` are all named. |
| SDK/app contract global value | Pass | Pass | Pass | Pass | Breaking change is explicitly accepted. |
| Persisted global metadata values | Pass | Pass | Pass | Pass | Migration scope names run metadata, team metadata/member trees, channel bindings, and duplicated projections found during implementation. |
| Full `skillAccessMode` field deletion | Pass | Pass | Pass | Pass | Follow-up deferral is explicit and constrained. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/context/skill-access-mode.ts` | Pass | Pass | Pass | Pass | Central enum/resolver cleanup. |
| `autobyteus-ts/src/agent/context/agent-config.ts` | Pass | Pass | Pass | Pass | Applies central resolver. |
| `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts` | Pass | Pass | Pass | Pass | Prompt composition only; no registry-wide policy. |
| `autobyteus-server-ts/src/agent-tools/skills/skill-tool-access.ts` | Pass | Pass | Pass | Pass | Policy owner for runtime skill tools. |
| `autobyteus-server-ts/src/agent-tools/skills/load-skill.ts` | Pass | Pass | Pass | Pass | Tool-specific formatting/loading after policy. |
| `autobyteus-server-ts/src/agent-tools/skills/get-available-skills.ts` | Pass | Pass | Pass | Pass | Tool-specific listing after policy. |
| `autobyteus-server-ts/src/agent-tools/skills/get-skill-content.ts` | Pass | Pass | Pass | Pass | Tool-specific content after policy. |
| Runtime backend bootstrappers/materializers | Pass | Pass | Pass | Pass | Existing runtime adapters remain owners of runtime-specific rendering. |
| GraphQL type files | Pass | Pass | Pass | Pass | Transport shape only; no skill policy ownership. |
| Frontend launch/channel components and defaults | Pass | Pass | Pass | Pass | UI owns operational launch fields, not authorization. |
| Migration and registry files | Pass | Pass | Pass | Pass | Migration owns old persisted value cleanup. |
| SDK contract/default files | Pass | Pass | Pass | Pass | External contract alignment. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent definition skill configuration | Pass | Pass | Pass | Pass | Launch/provisioning depend on definition allowlist, not a launch override. |
| Skill tool access policy | Pass | Pass | Pass | Pass | Runtime tools must not call `SkillService.listSkills()` unfiltered. |
| Runtime backend skill materialization | Pass | Pass | Pass | Pass | Backends adapt configured skills only. |
| App-data migration framework | Pass | Pass | Pass | Pass | Parsers must not keep permanent global fallback. |
| Control-plane skill catalog | Pass | Pass | Pass | Pass | Explicitly separated from runtime agent tools. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent definition skill allowlist | Pass | Pass | Pass | Pass | Removes launch UI bypass. |
| Skill tool access policy | Pass | Pass | Pass | Pass | Centralizes list/read/load authorization. |
| Runtime backend materialization | Pass | Pass | Pass | Pass | Prevents direct all-registry materialization. |
| Migration framework | Pass | Pass | Pass | Pass | Old data rewrite is not hidden inside parser compatibility. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `CreateAgentRunInput.skillAccessMode` if retained | Pass | Pass | Pass | Medium | Pass |
| `TeamMemberConfigInput.skillAccessMode` if retained | Pass | Pass | Pass | Medium | Pass |
| `ChannelBindingLaunchPreset.skillAccessMode` if retained | Pass | Pass | Pass | Medium | Pass |
| `resolveSkillAccessMode(requestedMode, preloadedSkillCount)` | Pass | Pass | Pass | Low | Pass |
| `resolveSkillToolAccessPolicy(context)` | Pass | Pass | Pass | Low | Pass |
| `SkillService.listSkills()` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/skills/` | Pass | Pass | Low | Pass | Runtime tool policy belongs with runtime tools. |
| `autobyteus-server-ts/src/app-data-migrations/migrations/` | Pass | Pass | Low | Pass | Data cleanup belongs in migration subsystem. |
| `autobyteus-web/components/workspace/config/` | Pass | Pass | Low | Pass | Launch form cleanup is local to launch UI. |
| `autobyteus-server-ts/src/api/graphql/types/` | Pass | Pass | Medium | Pass | Transport schema update is correct; policy must remain elsewhere. |
| SDK contract/backend SDK source paths | Pass | Pass | Low | Pass | Contract and normalizer ownership is clear. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Configured skill source | Pass | Pass | N/A | Pass | Reuses `AgentDefinition.skillNames`. |
| Runtime skill prompt/materialization | Pass | Pass | N/A | Pass | Extends existing processors/materializers. |
| Tool allowlist enforcement | Pass | Pass | N/A | Pass | Extends `skill-tool-access.ts`. |
| Data cleanup | Pass | Pass | Pass | Pass | New migration is justified by enum removal. |
| External app defaults | Pass | Pass | N/A | Pass | Extends existing SDK normalizer/defaults. |
| Control-plane skill browsing | Pass | Pass | N/A | Pass | Follow-up/control-plane path is correctly kept separate. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| API enum/client requests | No | Pass | Pass | `GLOBAL_DISCOVERY` requests should fail validation. |
| Parser fallback | No permanent fallback | Pass | Pass | Migration is preferred; strict parser follows. |
| Runtime prompt branch | No | Pass | Pass | All-registry branch removed. |
| Skill tools | No | Pass | Pass | Runtime enforcement applies to list/read/load. |
| UI relabeling/advanced mode | No | Pass | Pass | Removed, not renamed. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Shared enum/resolver | Pass | Pass | Pass | Pass |
| Runtime prompt/materializers | Pass | Pass | Pass | Pass |
| Skill tools | Pass | Pass | Pass | Pass |
| API/frontend/generated types | Pass | Pass | Pass | Pass |
| SDK contracts/defaults | Pass | Pass | Pass | Pass |
| App-data migration | Pass | Pass | Pass | Pass |
| Tests/fixtures/localization cleanup | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| General/orchestrator agent | Yes | Pass | Pass | Pass | Clarifies configured broad-skill agent vs global discovery. |
| No configured skills | Yes | Pass | Pass | Pass | Clarifies zero skills means no skills. |
| Runtime skill listing | Yes | Pass | Pass | Pass | Clarifies tool bypass closure. |
| Future dynamic child agent | Yes | Pass | Pass | Pass | Clarifies explicit `skillNames[]` future direction. |
| Persisted legacy value | Yes | Pass | Pass | Pass | Clarifies migration over parser fallback. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Tracked generated/built artifacts | The repo tracks generated GraphQL/localization files and SDK `dist` files; type drift can persist if only sources are edited. | Implementation should update/regenerate all tracked generated and built artifacts that still contain `GLOBAL_DISCOVERY` or removed UI labels. | Residual implementation risk; not a design blocker because generated/type drift cleanup is already in scope. |
| Exact app-data file inventory | Existing persisted values can live in run metadata, team metadata/member trees, channel binding files, and projections. | Implementation should use `rg "skillAccessMode"` plus store/provider tests to confirm migration coverage. | Residual implementation risk; design explicitly requires this. |
| Non-agent administrative skill listing | If any current caller uses runtime skill tools as a catalog, filtering changes behavior. | Keep runtime enforcement strict; route admin/catalog needs to existing control-plane APIs or follow-up work. | Accepted residual risk. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Migration coverage is the main implementation risk: any missed `GLOBAL_DISCOVERY` string in persisted app data can break strict enum parsing or history serialization.
- Generated/build artifact drift is likely because GraphQL generated types, localization generated files, and SDK `dist` artifacts are tracked.
- Keeping internal `skillAccessMode` as a temporary plumbing field remains a follow-up cleanup target; implementation must avoid re-exposing it as a normal user policy switch.
- Runtime skill tool enforcement must stay strict even if this uncovers workflows that used agent tools as an administrative catalog.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: The design has adequate spine coverage, clear ownership, explicit legacy removal, and a realistic migration/refactor sequence. Proceed to implementation with the residual risks above treated as implementation checklist items.
