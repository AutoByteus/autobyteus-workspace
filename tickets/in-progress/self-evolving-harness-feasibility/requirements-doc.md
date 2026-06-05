# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — user-approved for formal design on 2026-06-04; revised after architecture review round 1, user config-ownership feedback, skill-root/anonymized-evidence feedback, and MVP simplification feedback through 2026-06-05.

## Goal / Problem Statement

Investigate arXiv:2605.30621, understand how the paper's harness self-evolution method works, and determine whether AutoByteus can support an analogous self-evolving capability for project agents without compromising safety, reviewability, privacy, or runtime stability.

The recommended target is **feature-gated, skill-first harness self-evolution**: a visible evolver agent/team analyzes run evidence and improves configured skills. For the manual MVP path, the user's explicit "improve" action launches a visible evolver with `autoExecuteTools: true`; the evolver may directly edit target skill packages/roots using existing shell tooling. The feature is off by default and intended for Git-backed testing first.

## Investigation Findings

### Paper Summary

- The paper defines an LLM agent as a frozen model backbone plus an editable external harness. Harness artifacts include prompts, skills, memories, and tools.
- Self-evolution is not model fine-tuning. The evolver reads execution evidence from prior tasks, edits allowed harness artifacts, then the next task-solving cycle runs against the updated harness.
- The paper separates two capabilities:
  - **Harness-updating**: whether the evolver can create useful persistent harness updates from evidence.
  - **Harness-benefit**: whether the task-solving agent can actually use the updated harness during later task execution.
- Its central empirical result is that harness-updating is relatively flat across model capability tiers, while harness-benefit is non-monotonic. Weak task agents often do not benefit because they fail to activate relevant harness artifacts or fail to follow them faithfully over long trajectories.
- Practical implication: use sufficient capability for the task-solving agent; the evolver can be comparatively modest. Invest engineering effort in harness activation, adherence, evidence quality, provenance, validation, and rollback.

### AutoByteus Feasibility Summary

AutoByteus is a good architectural candidate for harness-level self-evolution because it already has:

- Editable agent/team definitions with durable instruction bodies and configured tool/skill references.
- Skill loading, discovery, creation/update/delete services, contextual configured-skill resolution, and per-skill versioning/rollback.
- Runtime prompt assembly that injects system prompts, available skills, and tool manifests.
- Run memory / raw trace capture for user messages, assistant messages, reasoning, tool calls/results, working context snapshots, and external runtime events.
- Tool and MCP registries that can be inspected and recommended against.
- Codex/Claude workspace skill materialization, making skills a real harness surface across external runtimes too.

The current gap is not substrate; it is **orchestration and visibility**. The project does not yet appear to have one authoritative service that extracts evidence, resolves target skill root paths, launches a visible evolver run, records the visible evolver run/provenance, and notifies/reloads affected targets as one cohesive self-evolution workflow.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Feature
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes if direct file mutation is exposed broadly without feature gating or Git-backed rollback; acceptable for MVP if globally disabled by default, manually triggered, visible, and tested against Git-backed skill packages.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / Missing Invariant
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely not needed for core runtime initially; add a new service boundary for launch/context/provenance/notification. Deeper runtime changes and formal measurement/reporting should be deferred until the simple visible evolver loop proves useful.
- Evidence basis: Paper and official code show an explicit workspace/manifest/evolution-loop/verifier/rollback architecture. AutoByteus codebase already has separate owners for definitions, skills, memory, and MCP/tool config, but no central self-evolution launch/provenance/notification spine.
- Requirement or scope impact: A feasible MVP must centralize self-evolution launch and visibility while allowing direct edits only to explicit target skill roots under a globally disabled-by-default feature toggle. It must not let agents mutate arbitrary files, tool definitions, model parameters, or unrelated production harnesses.

## Recommendations

### Recommendation

Support self-evolution as a **conditional, feature-gated, skill-first harness-evolution feature**, not as model self-training or broad autonomous repository mutation.

### Recommended MVP Boundary

1. Add a `SelfEvolutionService` / `HarnessEvolutionOrchestrator` server-side capability that owns evolution request creation, evidence/skill-root context, visible evolver launch, minimal run provenance, and target notification.
2. Start **skill-first**: the MVP mutates only writable configured skills. Agent/team instructions, memory lessons, and tools/MCP remain report-only unless separately approved later.
3. Run the evolver as a normal visible agent first, compaction-agent style. An evolver team can be a later evolution strategy.
4. Expose only minimal user-facing settings: off/enabled, trigger strategy (`manual_only` implemented first; scheduled/signal reserved as not-implemented placeholders), and selected evolver agent. Do not expose separate approval or notification strategies in MVP.
5. In manual mode, the user's click launches the visible evolver run. The MVP evolver may directly edit target skill roots using existing `run_bash`/shell tooling; no custom diff/proposal tool is required.
6. Use existing run memory / run-history projection as evidence input, but redact sensitive content and preserve source run IDs.
7. Keep the MVP safety boundary simple: global feature toggle off by default, hidden UI unless enabled, manual trigger, visible evolver run, explicit target skill root paths, and Git-backed inspection/revert during testing.
8. After the visible evolver run completes, notify/reload affected target agents by default where possible; if no active target exists, next run uses any updated skill content.
9. Do not add a dedicated change-audit recorder or metrics/reporting service in MVP. The visible evolver run plus Git-backed developer inspection is the initial review surface.

### Explicit Non-Goals

- No model parameter updates or fine-tuning.
- No autonomous repository code changes.
- No arbitrary filesystem writes from an evolver.
- No hidden mutation of shared/global skills, team definitions, or MCP config.
- No fully automatic mutation of instructions, tools/MCP config, repository code, or model parameters in MVP.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

## In-Scope Use Cases

- UC-001: Summarize how the referenced paper defines and evaluates harness self-evolution.
- UC-002: Identify AutoByteus harness surfaces that could evolve, such as prompts/instructions, skills, memories, and tool/routine metadata.
- UC-003: Determine whether a feature-gated, visible, Git-backed self-evolution loop can be supported in the current project architecture.
- UC-004: Define implementation-ready requirements if support is feasible.
- UC-005: Define safety, provenance, consent/trigger, notification/reload, and Git-backed rollback requirements for persistent skill updates.

## Out of Scope

- Direct implementation in this investigation turn.
- Arbitrary production mutation outside explicit feature-gated/manual-triggered self-evolution and Git-backed testing/rollback.
- Model fine-tuning or parameter updates.
- Benchmark reproduction of the paper unless explicitly requested later.
- Durable tool/MCP creation or registration by an evolver in MVP.
- Changes to the software-engineering team workflow until separately approved.

## Functional Requirements

- REQ-001: The investigation must explain the paper's core concepts, especially harness-updating versus harness-benefit.
- REQ-002: The investigation must map the paper's harness types to concrete AutoByteus project surfaces.
- REQ-003: The feasibility recommendation must classify supported, partially supported, and unsupported self-evolution behaviors.
- REQ-004: Any proposed support must include persistent-update safety controls appropriate to the MVP: global off-by-default feature gating, explicit manual trigger/configuration as consent, visible evolver run provenance, notification/reload, and Git-backed rollback/testing.
- REQ-005: Any proposed support must avoid modifying base model parameters and must keep the task-solving agent runtime stable unless a future approved design changes that.
- REQ-006: Evolution evidence must be extracted from run memory/run history through a redaction and minimization step before being sent to an evolver.
- REQ-007: The MVP evolver does not need to emit typed change output or diffs; it may directly edit target skill packages/roots using existing shell tooling.
- REQ-008: The self-evolution service must provide explicit target skill root paths/context and record the visible evolver run; it does not need a separate proposal/apply service in MVP.
- REQ-009: Each evolution run should record only minimal provenance needed to connect the user action to the visible evolver run: source run IDs, evidence summary/hash when available, evolver model/config, target skill root paths, trigger/consent source, timestamp, visible evolver run ID/status, and target notification result. It must not require post-run Git status/diff capture in MVP.
- REQ-010: The requirements/design must preserve the paper's conceptual distinction between harness-updating and harness-benefit, but the MVP must not introduce a dedicated metrics/reporting service. Any benefit measurement is deferred to a later design after the simple manual loop is validated.

- REQ-011: The MVP trigger behavior must be manual-first. Enabling self-evolution must expose explicit manual self-improvement actions, not automatically run cron/signal evolution by default.
- REQ-012: The architecture must keep trigger and evolver strategy boundaries strategy-shaped internally: manual trigger plus single-evolver-agent are the first implementations; scheduled/signal triggers and evolver teams are deferred plug-ins.
- REQ-013: Self-evolution eligibility/configuration must be owned by runtime/run-launch configuration and run metadata snapshots, not by durable agent/team definitions. The design must define run-launch config owners, snapshot behavior, old-run behavior, and team-member semantics without changing the target agent's normal business-team membership.

- REQ-014: Scheduled and signal trigger strategies must be represented as explicit not-implemented/future placeholders in the strategy catalog or design contract, while only `manual_only` is selectable/executable in MVP.

- REQ-015: The single-agent evolver run must inherit the target run workspace context and use compaction-style runtime/model fallback: no separate model configuration is required; absent an explicit override, the evolver uses the target run runtime/model fallback while keeping its own run ID and memory.

- REQ-016: The single-agent evolver run must use `autoExecuteTools: true` so the helper run can complete without user tool-approval interaction.

- REQ-017: The MVP evolver strategy may use the existing `run_bash`/shell tooling to directly edit target skill roots, instead of introducing custom evolver-specific tools or requiring structured diff output.

- REQ-018: The built-in/default self-evolver agent definition for the direct-edit MVP must have access to the existing `run_bash` tool, and the evolution task message must include exact target skill root paths plus primary `SKILL.md` paths so the evolver can edit skills without custom tools.

- REQ-019: New target runs must snapshot a complete effective self-evolution run config derived from run-launch configuration and global defaults; manual evolution actions must use this snapshot rather than re-reading mutable current agent/team definitions.

- REQ-020: The `manual_only` trigger must have a concrete implementation boundary that creates the canonical evolution request. Future scheduled/signal triggers must reuse the same request path and remain non-executable in MVP.

- REQ-021: MVP UI/reporting must not claim quality or downstream benefit from completion of a self-evolver run. Formal harness-updating/harness-benefit metrics are future work, not an MVP service.

- REQ-022: The self-evolver direct-edit scope must treat each configured skill as a folder/package. The service must provide exact editable skill root directories plus primary `SKILL.md` paths, and the evolver instruction must clearly limit edits to those roots. A separate post-run audit/change-recorder is not required in MVP.

- REQ-023: Evolution evidence shown to the self-evolver must be anonymized, human-readable work-history evidence rather than raw trace internals. It must omit or redact bookkeeping identifiers, raw JSON event payloads, raw trace file paths, private paths, secrets, and one-off sensitive details by default.

## Acceptance Criteria

- AC-001: Paper summary names the method, artifacts updated, evidence sources used for updates, and key empirical conclusions.
- AC-002: Codebase investigation identifies relevant current files/components for agents, skills, memory, tools, runtime execution, external-runtime materialization, and team workflow.
- AC-003: Feasibility output states a clear yes/no/conditional recommendation and concrete MVP boundary.
- AC-004: Proposed requirements include verification steps for self-evolution update quality and safety.
- AC-005: Open risks and unknowns are explicitly recorded.
- AC-006: Future design must define a single authoritative evolution-cycle owner and must not spread direct mutation logic across runtime components.
- AC-007: Future design must show the MVP direct-edit path and explicitly keep automatic mutation scoped to target skill roots; non-skill artifact mutation remains out of scope unless separately approved.
- AC-008: Future design must include rollback behavior for each supported artifact family.

- AC-009: MVP design exposes manual self-evolution actions for eligible targets and does not require cron/signal scheduling to work.
- AC-010: MVP design shows a strategy-shaped boundary for future scheduled/signal triggers and evolver-team implementations, while implementing only manual trigger plus single evolver agent initially.

- AC-011: Design artifacts identify `scheduled` and `signal_based` trigger strategies as future/not-implemented placeholders and show that they will reuse the same `EvolutionRequest` path when implemented.

- AC-012: Design specifies the evolver run launch context, including target workspace inheritance, independent evolver run memory, runtime/model fallback, direct skill-root edit capability, and Git-backed rollback/testing assumptions.

- AC-013: Design specifies `autoExecuteTools: true` for the evolver run and explains that the MVP is feature-gated/off-by-default while direct skill edits are tested in Git-backed workspaces.

- AC-014: Design specifies the direct-edit MVP boundary: use existing `run_bash`/shell tools, pass explicit target skill root paths/context, avoid custom patch tools, and rely on Git/version history plus feature-gating for rollback/testing.

- AC-015: Design specifies how the evolver receives `run_bash` access and exact target skill root paths, including absolute path handling when skills live outside the target workspace root.

- AC-016: Design explicitly removes dedicated MVP metric/report services while preserving the paper distinction as future work and preventing UI from presenting evolver completion as proof of benefit.

- AC-017: Design specifies self-evolution as runtime/run-launch configuration, with snapshot behavior for standalone runs, team member runs, old runs with no snapshot, and team-run member-scoped semantics.

- AC-018: Design specifies the concrete `manual_only` trigger owner/interface and shows manual GraphQL starts entering the same canonical `EvolutionRequest` path reserved for future scheduled/signal triggers.

- AC-019: Design specifies skill-root/package edit scope for multi-skill agents, including editable root directories, primary `SKILL.md` files, supporting files inside roots, and prompt-level outside-root constraints.

- AC-020: Design specifies an evidence projection/anonymization owner and task prompt contract that presents work history in a compaction-like human-readable digest, not raw trace internals.

## Constraints / Dependencies

- Must use the dedicated task worktree `codex/self-evolving-harness-feasibility`.
- Must ground paper details in the referenced arXiv paper and public source/code when available.
- Must ground project feasibility in current repository architecture.
- Must not assume persistent self-modification is acceptable unless the feature is globally enabled, explicitly manually triggered, visible, and Git-backed rollback/testing is available.
- Must treat raw run traces as potentially sensitive.
- Must preserve existing runtime behavior unless and until a future design explicitly changes activation/adherence mechanics.

## Assumptions

- "Our project" refers to the AutoByteus workspace superrepo and its agent/runtime/team systems.
- The desired capability is harness-level evolution, not model weight evolution.
- The first useful product shape is a feature-gated manual direct-edit workflow for Git-backed skill testing, not a fully autonomous optimizer.
- Existing Git-backed skill repositories provide the MVP rollback path; analogous provenance/rollback may be needed later for stricter service-mediated or non-skill updates.

## Risks / Open Questions

- How to measure objective benefit when many user tasks lack pass/fail scores.
- How to prevent sensitive user/project data from being written into shared skills/prompts/memories.
- Whether agent/team definition updates need their own versioning model analogous to skill versioning.
- How to support activation/adherence across AutoByteus, Codex, and Claude runtime backends consistently.
- Whether self-evolution should be user-run scoped, agent scoped, project scoped, team scoped, or global.
- How to avoid reinforcing incorrect lessons from failed or ambiguous runs.
- How much UI/product surface is needed for inspecting visible evolver runs and relying on Git/manual review for changed files.

## Requirement-To-Use-Case Coverage

| Requirement | Use Case(s) |
| --- | --- |
| REQ-001 | UC-001 |
| REQ-002 | UC-002 |
| REQ-003 | UC-003 |
| REQ-004 | UC-003, UC-004, UC-005 |
| REQ-005 | UC-003, UC-004 |
| REQ-006 | UC-003, UC-005 |
| REQ-007 | UC-003, UC-004, UC-005 |
| REQ-008 | UC-003, UC-004, UC-005 |
| REQ-009 | UC-003, UC-005 |
| REQ-010 | UC-003, UC-005 |
| REQ-011 | UC-003, UC-004 |
| REQ-012 | UC-003, UC-004 |
| REQ-013 | UC-003, UC-004 |
| REQ-014 | UC-003, UC-004 |
| REQ-015 | UC-003, UC-004 |
| REQ-016 | UC-003, UC-004, UC-005 |
| REQ-017 | UC-003, UC-004, UC-005 |
| REQ-018 | UC-003, UC-004 |
| REQ-019 | UC-003, UC-004 |
| REQ-020 | UC-003, UC-004 |
| REQ-021 | UC-003, UC-005 |
| REQ-022 | UC-003, UC-004, UC-005 |
| REQ-023 | UC-003, UC-005 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Verify the paper was accurately understood. |
| AC-002 | Verify feasibility is based on real project architecture. |
| AC-003 | Verify decision usefulness. |
| AC-004 | Verify any future implementation has safety and quality gates. |
| AC-005 | Verify unresolved issues are explicit rather than hidden. |
| AC-006 | Verify the implementation has one owner/spine. |
| AC-007 | Verify implementation respects existing artifact ownership. |
| AC-008 | Verify persistent updates can be reversed. |
| AC-009 | Verify manual-first MVP behavior. |
| AC-010 | Verify future strategy extensibility without implementing automatic triggers now. |
| AC-011 | Verify future trigger placeholders are explicit but inactive in MVP. |
| AC-012 | Verify compaction-style evolver launch defaults are specified. |
| AC-013 | Verify evolver auto-exec behavior is specified with feature-gated direct-edit assumptions. |
| AC-014 | Verify evolver direct-edit boundary avoids custom tool proliferation and relies on Git-backed rollback/testing. |
| AC-015 | Verify direct-edit evolver has the existing shell tool and exact target paths needed to edit skills. |
| AC-016 | Verify MVP does not add metric/reporting complexity and does not claim downstream benefit from evolver completion. |
| AC-017 | Verify self-evolution config is run-config owned and snapshot behavior is unambiguous for standalone/team member runs. |
| AC-018 | Verify manual trigger strategy has a concrete implementation boundary. |
| AC-019 | Verify self-evolver scope covers skill folders/packages, not only primary SKILL.md files. |
| AC-020 | Verify self-evolver receives anonymized human-readable work-history evidence rather than raw trace internals. |

## Approval Status

Approved by user for formal design on 2026-06-04. Revised after architecture review round 1 on 2026-06-04 to clarify config snapshots and manual trigger strategy ownership. Revised again after user feedback to make self-evolution runtime/run-config owned rather than agent-definition owned, to target skill folders/packages with anonymized work-history evidence, and to remove dedicated change-recorder/audit and metrics services from the MVP. The formal design spec was further narrowed after fresh architecture review to remove start-mutation config overrides and raw trace path retention from the MVP contracts.

## User Refinement — 2026-06-02

The user clarified that, for AutoByteus, the system prompt is intentionally small and the primary behavioral control surface is the skill layer. Tools are comparatively few and mostly determined by the agent's business domain, so the self-evolution MVP should be **skill-first**:

- Primary evolving artifact: skills and skill organization.
- Secondary report-only artifacts: agent/team instructions and memories.
- Low-priority/non-MVP artifact: tool mutation, except recommendations about needed tools.
- Expected mechanism: an evolution service runs a visible self-evolver agent over past agent traces/history and exact target skill root paths; the evolver directly edits skill-root files through existing shell tooling when improvement is warranted.

## User Refinement — Evolver as Agent/Team and Human-Learning Analogy — 2026-06-02

The user clarified a product-level framing: the evolver should itself be an AutoByteus agent or agent team. The target agent runs tasks, uses skills, and produces traces. The evolver agent/team periodically analyzes those traces as experience, identifies higher-level patterns, and distills improved strategies back into skills. This mirrors human learning: activity creates experience traces; later reflection summarizes strategy; the distilled strategy changes future behavior.

Design implications:

- Treat evolution as a separate meta-agent workflow, not hidden runtime behavior inside the target agent.
- Model traces as episodic experience and skills as distilled procedural strategy.
- Support periodic/asynchronous evolution cycles driven by trace windows and feedback signals.
- Preserve a visible, feature-gated loop so direct edits remain testable and revertible through Git-backed workflows.
- Consider evolver-team roles such as trace curator, pattern analyst, skill architect, and validator; approval-review roles are optional/advanced, not MVP-default friction.

## User Refinement — Active Target-Agent Reload — 2026-06-04

The user clarified that applied skill improvements should notify active target agents so they can reload or adopt the improved skill. Design implication: changing a skill-root file is insufficient for active runs because runtime skill registries and injected prompts can cache old skill content. Future design should include a skill-update event/notification path and an active-run reload policy. MVP should default to next-run application, with optional queued-at-idle active-run notification/reload for native AutoByteus agents.

## User Refinement — Evolver Launch Topology — 2026-06-04

The user asked whether enabling self-evolution at launch should create an agent team containing both the target agent and a self-evolver agent so the evolver can message the target. Analysis: ordinary team membership would expose the evolver in team context/rosters and may distract the target agent from its business role. The recommended architecture is a separate background evolution/reflection run, possibly implemented by an agent/team, connected to the target through an evolution service and a control-plane skill-update notification/reload event. A visible coach/evolver teammate can be a separate explicit product mode, not the default.

## User Refinement — Simplified MVP Knobs — 2026-06-04

The user clarified that MVP should not expose separate approval/notification strategies. User-facing configuration should remain minimal: enabled/off, trigger strategy, and evolver selection. In manual mode, the user's explicit "improve" action should authorize running the visible evolver, which may directly edit target skill roots through existing shell tooling. Target notification/reload should be default system behavior, not a separate strategy setting.


## User Refinement — Manual-First Strategy Architecture — 2026-06-04

The user initially discussed agent/team/run configuration, then clarified that self-evolution feels more like runtime/run configuration than an intrinsic agent definition attribute. MVP should therefore make self-evolution configurable at run-launch / team-run launch time, not as an agent definition property. Enabling self-evolution makes the target eligible for self-improvement and exposes a manual action such as `Improve from this run`; it should not imply automatic scheduling yet. The architecture should still use a trigger-strategy boundary so scheduled/cron or signal-based triggers can be added later without redesign. The evolver strategy should start as a single visible self-evolver agent, with multi-agent/team evolvers deferred.

Design implications:

- Add self-evolution eligibility/configuration at run-launch and team-run launch configuration surfaces; do not add it as an intrinsic agent/team definition attribute in MVP.
- MVP trigger strategy: `manual_only`.
- MVP evolver strategy: `single_evolver_agent`.
- Keep `SelfEvolutionTriggerStrategy` and `SelfEvolutionEvolverStrategy` boundaries internally, even if only one implementation of each is initially enabled.
- Do not implement cron/signal scheduling in the first slice unless separately chosen; keep those as future strategy implementations.
- When manual mode is enabled, show the self-evolve action on relevant run/detail/history surfaces only when there is enough evidence and at least one writable configured skill target.


## User Refinement — Future Trigger Strategy Placeholders — 2026-06-04

The user clarified that scheduled and signal trigger strategies should remain visible in the architecture as future strategy implementations, but they should be explicitly marked not implemented in the MVP. This preserves a roadmap clue and prevents accidental scope expansion. MVP implements only `manual_only`; `scheduled` and `signal_based` are strategy placeholders that must not be executable/selectable until implemented later.


## User Refinement — Compaction-Style Evolver Launch Defaults — 2026-06-04

The user clarified that the self-evolver agent should be launched similarly to the compaction agent. The visible evolver run should use the target/original agent run workspace context. If no custom runtime/model is specified in self-evolution settings, the evolver should use the target run's runtime/model fallback rather than forcing separate model configuration. The evolver run still owns its own run memory, but in the simplified MVP it may directly edit target skill roots in the Git-backed workspace.


## User Refinement — Evolver Auto-Execute Tools — 2026-06-04

The user clarified that the self-evolver agent should run with `autoExecuteTools: true` because the user will not interact with the helper run or approve individual tool calls. This changes the previous tentative compaction-style assumption.


## User Refinement — Evolver Tool Boundary — 2026-06-04

The user further clarified that MVP should not create many evolver-specific tools. The self-evolver should use the existing `run_bash`/shell capability with `autoExecuteTools: true` and may directly update skill-root files. No structured diff output is required from the evolver. This is acceptable for the initial experimental product shape because the feature is globally disabled by default, hidden from agent/team configuration unless enabled, and the relevant skill packages are typically Git-backed so testing can revert changes. The service should still provide the target skill root paths/context and record the visible evolver run. Dedicated post-run working-tree capture is not required in MVP.


## User Refinement — Feature-Gated Direct Skill Editing — 2026-06-04

The user clarified the desired MVP should be much simpler: do not create many special tools for the evolver and do not require the evolver to emit structured diffs. When the global self-evolution feature toggle is enabled, the visible evolver agent can run with `autoExecuteTools: true`, use the existing `run_bash`/shell tool, and directly edit skill-root files. The rollback/testing boundary is product/process based: the feature is off by default and hidden unless enabled, and skill packages are generally Git-backed so changes can be inspected and reverted during testing.


## User Refinement — Run Bash Tool Availability — 2026-06-04

The final direct-edit MVP depends on the existing `run_bash` tool rather than custom evolver tools. The built-in/default self-evolver agent should therefore be configured with `run_bash` access, and the evolution service should pass exact target skill root paths in the task prompt. Because `run_bash` supports absolute working directories/paths, the skill path may be outside the target run workspace as long as the task message gives the exact path.


## User Refinement — Remove Change Recorder And Metrics Service From MVP — 2026-06-05

The user clarified that the direct-edit MVP should trust the self-evolver's explicit instructions and should not add a redundant change recorder, post-run audit service, or formal metrics service. The simplified MVP boundary is: visible manual evolver run, exact editable skill roots in the task message, `run_bash` with `autoExecuteTools: true`, minimal provenance linking source run to evolver run, and default target notification/reload. Git remains the developer/testing rollback surface, but the product does not need to compute changed paths or harness-benefit metrics in the initial implementation.
