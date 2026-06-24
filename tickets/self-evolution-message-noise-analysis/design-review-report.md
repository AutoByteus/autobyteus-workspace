# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolution-message-noise-analysis/tickets/self-evolution-message-noise-analysis/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolution-message-noise-analysis/tickets/self-evolution-message-noise-analysis/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolution-message-noise-analysis/tickets/self-evolution-message-noise-analysis/design-spec.md`
- Current Review Round: 1
- Trigger: Initial architecture review requested by `solution_designer` after user-approved Design-ready requirements on 2026-06-24.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Reviewed the upstream package plus current repository files for the prompt builder, Skill Self-Evolver template, built-in bootstrapper, configured private skill resolver, direct-message grant registry, current tests, file traversal/ignore utilities, and self-evolution docs.

Round rules:
- Reuse the same finding IDs across reruns for the same unresolved design-review issues.
- Create new finding IDs only for newly discovered issues.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review | N/A | 0 | Pass | Yes | Design is ready for implementation with residual implementation risks called out below. |

## Reviewed Design Spec

The design proposes a clean ownership split for self-evolution prompt/static-guidance cleanup:

- `SelfEvolutionCompanionTriggerMessageBuilder` owns only dynamic task-packet composition.
- A new `SelfEvolutionSkillPackageTreeRenderer` owns bounded relative package-tree rendering with `SKILL.md [entry]` semantics.
- Built-in Skill Self-Evolver `agent.md` becomes a thin role/boundary/task-contract facade.
- A private `retrospective-skill-coach` skill package owns the detailed retrospective coaching workflow, signal patterns, package-improvement playbook, and examples.
- `BuiltInAgentBootstrapper` extends product-managed sync to mirror template `skills/` directories into app-data built-in agent directories.
- Existing configured agent-private skill resolution and direct-message grant enforcement are reused, not reimplemented in prompt text.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design names the posture as cleanup + behavior change + small built-in package feature. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design classifies duplicated policy/coordination, boundary/ownership issue, and file responsibility drift, backed by the current noisy prompt, oversized-agent.md risk, and missing built-in private skill sync. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design states refactor is needed now and scopes it to prompt contract, private skill package shape, tree rendering, and built-in skill sync. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Concrete ownership map, file mapping, migration sequence, removal plan, and tests reflect the refactor decision. Out-of-scope diff auditing/read-only trace tooling is explicitly deferred. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First review round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Manual self-improve request to companion task packet | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Built-in bootstrap to app-data built-in agent/private skill | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Skill root to bounded package tree text | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Companion durable edits to grant-scoped `skill_update` | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/self-evolution/services/companion` | Pass | Pass | Pass | Pass | Prompt builder remains the task-packet owner; renderer is a local off-spine concern. |
| `src/built-in-agents` | Pass | Pass | Pass | Pass | Bootstrapper already owns product-managed template sync and is the correct place to add private skill mirroring. |
| `src/built-in-agents/templates/skill-evolver` | Pass | Pass | Pass | Pass | Template package owns static self-evolver content. |
| `src/skills/services` | Pass | Pass | Pass | Pass | Existing private skill resolver is reused without widening its boundary. |
| `docs/modules` | Pass | Pass | Pass | Pass | Module rationale stays in docs rather than runtime prompt text. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Prompt package tree rendering | Pass | Pass | Pass | Pass | Separate renderer prevents filesystem traversal/format logic from becoming prompt-builder clutter. |
| Built-in recursive template skill sync | Pass | N/A | Pass | Pass | Keeping helper methods inside bootstrapper is appropriate because this is product-managed built-in sync, not a general installer. |
| Private coaching guidance/examples | Pass | Pass | Pass | Pass | Normal skill package files are the right reusable structure for detailed coaching content. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `SelfEvolutionSkillTarget` | Pass | Pass | Pass | N/A | Pass | Design keeps target identity/root/entry path facts tight and avoids persisting rendered tree strings. |
| `SelfEvolutionCompanionTriggerRequest` | Pass | Pass | Pass | N/A | Pass | Dynamic request facts remain the builder input. |
| Built-in bootstrap result shape | Pass | Pass | Pass | N/A | Pass | Design allows a clear `syncedSkills`/`syncedSkillDirectories` style status if implementation needs testable visibility. |
| Runtime message metadata | Pass | Pass | Pass | N/A | Pass | Design preserves metadata unless implementation finds a strong reason to rename; user-visible prompt semantics are corrected. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime `Rules:` section | Pass | Pass | Pass | Pass | Replaced by concise task packet plus static guidance/private skill/docs/grants. |
| Runtime raw-trace defensive negative | Pass | Pass | Pass | Pass | Runtime prompt uses positive evidence wording; raw trace rationale remains docs/static guidance if needed. |
| Runtime semantic-completeness/backend-protocol rationale | Pass | Pass | Pass | Pass | Correctly moved to module docs. |
| `Primary guidance file` wording | Pass | Pass | Pass | Pass | Replaced by package tree and `SKILL.md [entry]` semantics. |
| Bootstrapper two-file-only limitation | Pass | Pass | Pass | Pass | Replaced by product-managed private skill directory mirroring. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `self-evolution-companion-trigger-message-builder.ts` | Pass | Pass | Pass | Pass | Prompt text assembly remains centralized, but package tree traversal is delegated. |
| `self-evolution-skill-package-tree-renderer.ts` | Pass | Pass | N/A | Pass | Owns a bounded tree projection, not skill resolution or edit policy. |
| `built-in-agent-bootstrapper.ts` | Pass | Pass | N/A | Pass | Extending product-managed sync fits the existing owner. |
| `templates/skill-evolver/agent.md` | Pass | Pass | Pass | Pass | Thin facade avoids becoming a detailed playbook. |
| `templates/skill-evolver/agent-config.json` | Pass | Pass | N/A | Pass | Adds the configured private skill name under the existing config boundary. |
| `skills/retrospective-skill-coach/SKILL.md` | Pass | Pass | Pass | Pass | Entry file owns workflow/routing, not all details. |
| `references/high-signal-trace-patterns.md` | Pass | Pass | N/A | Pass | Evidence interpretation is a coherent reference concern. |
| `references/package-improvement-playbook.md` | Pass | Pass | N/A | Pass | Package change-shape guidance is coherent. |
| `references/examples.md` | Pass | Pass | N/A | Pass | Judgment examples are correctly separate from the entry flow. |
| `docs/modules/self_evolution.md` | Pass | Pass | N/A | Pass | Module contract/rationale doc is the right home for internal explanation. |
| Focused tests | Pass | Pass | N/A | Pass | Test areas are named for prompt, renderer, bootstrap/private skill sync, and docs assertions. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Companion session to trigger builder | Pass | Pass | Pass | Pass | Session posts via builder rather than assembling prompt fragments. |
| Trigger builder to package tree renderer | Pass | Pass | Pass | Pass | Prompt owner delegates bounded filesystem projection. |
| Tree renderer to filesystem/ignore constants | Pass | Pass | Pass | Pass | Renderer must not become a generic file explorer replacement. |
| Built-in bootstrapper to template dirs | Pass | Pass | Pass | Pass | Bootstrapper owns app-data built-in mutation; user package roots remain off-limits. |
| Skill Self-Evolver `agent.md` to private skill | Pass | Pass | Pass | Pass | Static facade points at configured skill rather than embedding the full method. |
| Direct-message grant/router | Pass | Pass | Pass | Pass | Enforcement remains code-owned and is not bypassed by prompt wording. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `SelfEvolutionCompanionTriggerMessageBuilder` | Pass | Pass | Pass | Pass | Session service uses the builder as the prompt boundary. |
| `BuiltInAgentBootstrapper` | Pass | Pass | Pass | Pass | No separate skill-evolver-specific installer is introduced. |
| Direct-message grant/router | Pass | Pass | Pass | Pass | Final notification constraints are retained as hard service enforcement. |
| Private `retrospective-skill-coach` skill | Pass | Pass | Pass | Pass | Detailed examples/manual stay out of runtime prompt. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `SelfEvolutionCompanionTriggerMessageBuilder.build(...)` | Pass | Pass | Pass | Low | Pass |
| `SelfEvolutionSkillPackageTreeRenderer.render(target)` | Pass | Pass | Pass | Low | Pass |
| `BuiltInAgentBootstrapper.bootstrapBuiltInAgent(...)` | Pass | Pass | Pass | Low | Pass |
| `ConfiguredAgentSkillResolver.resolveForAgent(...)` | Pass | Pass | Pass | Low | Pass |
| `send_message_to(target_agent_run_id, message_type, reference_files)` grant path | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/self-evolution/services/companion` | Pass | Pass | Low | Pass | Contains companion session/prompt concerns. |
| `src/built-in-agents` | Pass | Pass | Low | Pass | Contains product-managed built-in sync. |
| `templates/skill-evolver/skills/retrospective-skill-coach` | Pass | Pass | Low | Pass | Follows agent-private skill convention. |
| `templates/skill-evolver/skills/retrospective-skill-coach/references` | Pass | Pass | Low | Pass | Splits durable method references without fragmenting the entry file. |
| `docs/modules/self_evolution.md` | Pass | Pass | Low | Pass | Existing module documentation home. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent-private skill loading | Pass | Pass | N/A | Pass | Existing resolver already supports `agentDir/skills/<name>`. |
| Product-managed template sync | Pass | Pass | N/A | Pass | Existing bootstrapper is extended. |
| Prompt package tree rendering | Pass | Pass | Pass | Pass | Existing full tree utility is not a perfect fit because prompt needs caps, entry annotation, and symlink-safe behavior. |
| Direct final notification enforcement | Pass | Pass | N/A | Pass | Existing grants remain authoritative. |
| Work trace projection/privacy rationale | Pass | Pass | N/A | Pass | Existing docs/projection path remains the rationale owner. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Old prompt `Rules:` format | No | Pass | Pass | Design rejects dual prompt format and feature flags. |
| `Primary guidance file` wording | No | Pass | Pass | Clean-cut replacement with entry-file/package-tree language. |
| Private skill without bootstrap sync | No | Pass | Pass | Rejected; sync is included. |
| Raw-trace/internal-rationale runtime language | No | Pass | Pass | Removed from runtime prompt, retained where appropriate in docs/static guidance. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Package tree renderer and async builder wiring | Pass | Pass | Pass | Pass |
| Prompt replacement and prompt tests | Pass | Pass | Pass | Pass |
| Private skill template addition and thin agent/config updates | Pass | Pass | Pass | Pass |
| Built-in bootstrap skill sync | Pass | Pass | Pass | Pass |
| Docs update and targeted test run | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime task packet shape | Yes | Pass | Pass | Pass | Requirements include target prompt shape and forbidden phrases. |
| Thin `agent.md` shape | Yes | Pass | N/A | Pass | Requirements include target draft. |
| Private coaching skill package | Yes | Pass | Pass | Pass | Requirements include full draft with good/bad examples. |
| Package tree entry-file semantics | Yes | Pass | Pass | Pass | `SKILL.md [entry]` example directly addresses misleading `Primary guidance file`. |
| Trace-to-SOP/no-change/package-structure coaching | Yes | Pass | Pass | Pass | Examples cover durable and non-durable transformations. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Exact package-tree cap constants | Affects prompt token budget and omitted context size. | Implementation should choose explicit constants and cover them in tests; architecture does not require a specific numeric value. | Residual implementation risk, not blocking. |
| Runtime metadata field naming around `primary` vs `entry` | Existing metadata is internal and currently only test-observed, but naming may confuse future maintainers. | Implementation may keep metadata for compatibility or add/rename to entry-oriented metadata if no consumers rely on the old key. Ensure prompt/static guidance do not use `Primary guidance file`. | Residual implementation consideration, not blocking. |
| Static raw-trace prohibition wording | Product may still want a stable no-raw-trace rule outside the runtime prompt. | If added, keep it in `agent.md` or private skill as generalized guidance without reintroducing file-pattern noise into the runtime task packet. | Residual product-content choice, not blocking. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A - no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Package-tree rendering must pick concrete depth/entry caps, exclude hidden/cache/generated/dependency/binary-heavy paths, avoid repeated absolute-path leakage, and not follow symlinks. The design names these constraints and the implementation must make them test-visible.
- Built-in `skills/` mirroring should remain limited to product-managed app-data built-in agent directories. Tests must prove user package roots and standalone local agents are not modified.
- Prompt regression tests should assert required/forbidden phrases and sections rather than a brittle full prompt string.
- If metadata naming is adjusted from `primary` to `entry`, implementation should do it deliberately and update tests; if retained, it must stay internal and must not leak into the user-facing prompt/docs as authority language.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: The design is spine-first, ownership-led, concrete enough for implementation, and avoids compatibility dual paths. Proceed to implementation with the residual implementation risks above tracked in tests.
