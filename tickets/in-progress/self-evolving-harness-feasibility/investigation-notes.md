# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; requirements approved; formal design produced for architecture review.
- Investigation Goal: Understand arXiv:2605.30621 and determine whether AutoByteus can safely support harness-level self-evolving agents.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: The request spans external research interpretation plus multiple possible AutoByteus harness surfaces: prompts/instructions, skills, memory, tools, runtime execution, validation, repository/file mutation, and team workflow.
- Scope Summary: Produce a feasibility and design-basis analysis, not implementation.
- Primary Questions Resolved:
  1. The paper updates external harness artifacts, not model weights.
  2. AutoByteus already has concrete harness artifacts and run-evidence sources.
  3. A feasible MVP is the feature-gated, manual, visible direct-edit workflow using existing `run_bash` and Git-backed rollback/testing.
  4. Autonomous model training, tool registration, and broad repository mutation should remain out of scope.

## Request Context

User provided `https://arxiv.org/abs/2605.30621` and asked: "investigate how this paper works, and think about whether its possible to support self evolving in our project".

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/in-progress/self-evolving-harness-feasibility`
- Current Branch: `codex/self-evolving-harness-feasibility`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed before worktree creation.
- Task Branch: `codex/self-evolving-harness-feasibility` at `1678dc82b705d24c58b073c75f363d96b5d4cc3c`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Requirements are refined but not user-approved; do not implement until requirements/design are approved.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-02 | Web | `https://arxiv.org/abs/2605.30621` | Identify paper title, date, abstract, code link, and official metadata. | Paper submitted 2026-05-28; title: "Harness Updating Is Not Harness Benefit: Disentangling Evolution Capabilities in Self-Evolving LLM Agents"; abstract identifies prompts, skills, memories, and tools as editable external harnesses. | None. |
| 2026-06-02 | Web/Repo | `https://github.com/A-EVO-Lab/a-evolve/tree/release/harness-evolution` | Inspect official implementation. | Official implementation repo on branch `release/harness-evolution`; README summarizes harness-updating/harness-benefit and project structure. | None. |
| 2026-06-02 | Command | `pwd && git rev-parse --show-toplevel 2>/dev/null || true && git status --short --branch && git remote -v && git branch -vv` | Bootstrap repository context from user's starting checkout. | Starting checkout was `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` on `personal` tracking `origin/personal`, not a dedicated ticket branch. | Complete. |
| 2026-06-02 | Command | `git fetch origin --prune && git worktree add -b codex/self-evolving-harness-feasibility /Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility origin/personal` | Create mandatory dedicated task worktree/branch from refreshed base. | Created branch/worktree successfully at `1678dc82b705d24c58b073c75f363d96b5d4cc3c`. | Use this worktree for all artifacts and investigation. |
| 2026-06-02 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required design reference. | Key principle for future design: authoritative boundaries, spine-first ownership, no compatibility wrappers, explicit removal/decommission plan. | Apply during design if approved. |
| 2026-06-02 | Command/Data | Downloaded PDF to `tickets/in-progress/self-evolving-harness-feasibility/external-paper/arxiv-2605.30621.pdf`; extracted text to `.txt`. | Read full paper content, equations, methodology, benchmarks, results, limitations. | Paper defines agent `A_t=(f,H_t)`, evolution updates `H_t`; separates metrics for base performance, pairwise gain, updater capability, and benefit capability; evaluates SWE-bench Verified, MCP-Atlas, SkillsBench. | None. |
| 2026-06-02 | Repo | Cloned `A-EVO-Lab/a-evolve` to `.tmp_external/a-evolve`, branch `release/harness-evolution`, commit `986d97d43b6313c94c7e72c0b0ab6181ed9edba0`. | Validate the paper's operational loop and artifact model. | Implementation has a manifest/workspace contract, evolution loop, unified engine, LLM bash operator with scoped artifact enforcement, verifier/rollback, and git versioning for harness workspaces. | None. |
| 2026-06-02 | Code | `pnpm-workspace.yaml` | Identify project packages and likely ownership boundaries. | Workspace includes server, TS runtime, web, SDKs, message gateway, and applications. | None. |
| 2026-06-02 | Code | `autobyteus-server-ts/src/agent-definition/...` | Inspect agent-definition persistence and update ownership. | `AgentDefinition` stores instructions, tool names, processor names, skill names, ownership/source metadata, and launch config; file provider stores `agent.md` plus `agent-config.json`; service owns CRUD/update/duplicate. | Future design should call service, not raw-write definitions. |
| 2026-06-02 | Code | `autobyteus-server-ts/src/agent-team-definition/...` | Inspect team-definition persistence and update ownership. | Team definitions store team instructions, nodes, coordinator, ownership/source metadata; service validates graph/coordinator/member scopes and updates files. | Future design should call team service for team instruction proposals. |
| 2026-06-02 | Code | `autobyteus-ts/src/agent/context/agent-config.ts` and prompt processors | Inspect runtime harness injection. | `AgentConfig` carries system prompt, tools, processors, skills, skill access mode, memory dir. Default processors inject tool manifest and available skills; API tool mode removes tool manifest injection. | Evolved skills/prompts can affect runtime via existing pipeline. |
| 2026-06-02 | Code | `autobyteus-ts/src/agent/bootstrap-steps/system-prompt-processing-step.ts`; `autobyteus-ts/src/agent/llm-request-assembler.ts` | Inspect prompt assembly. | Base system prompt is processed by pipeline and configured on LLM; request assembler appends system prompt to working context when needed. | Future design can dry-run prompt assembly to validate updates. |
| 2026-06-02 | Code | `autobyteus-ts/src/skills/...`; `autobyteus-server-ts/src/skills/...` | Inspect skills as harness artifacts. | Skills have loader/registry/runtime `load_skill` tool; server has discovery, create/update/delete/enable/disable, configured-agent resolver, and per-skill git versioning. | Skills are strongest MVP target. |
| 2026-06-02 | Code | `autobyteus-ts/src/memory/...`; `autobyteus-server-ts/src/agent-memory/...`; `autobyteus-server-ts/src/run-history/projection/...` | Inspect evidence and memory surfaces. | Runtime records raw traces, tool intents/results, user/assistant messages, working context snapshots, external runtime events, and projected historical replay events. | Evidence extractor/redactor can be built on these. |
| 2026-06-02 | Code | `autobyteus-ts/src/tools/...`; `autobyteus-server-ts/src/mcp-server-management/...` | Inspect tools/MCP surfaces. | Central tool registry and MCP registrar/config service can list/discover/register tools. Tool/MCP mutation has high side-effect risk. | MVP should inspect/recommend only. |
| 2026-06-02 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/...`; `codex/...`; `claude/...` | Inspect how definitions and skills become runtime harnesses across backends. | AutoByteus backend resolves definitions, configured skills, tools, memory dir; Codex/Claude bootstrappers compose instructions and materialize skills by symlinking into workspace skill dirs. | Self-evolution should be backend-aware for activation/adherence. |

## Paper Findings

### Definitions / Method

- Agent state at evolution step `t`: frozen model backbone plus harness state, `A_t=(f,H_t)`.
- Harness state includes editable external components such as prompts, skills, memory, and tools.
- Evolver reads prior harness plus execution evidence and produces a harness delta; applying that delta creates the next harness state.
- Evolution protocol:
  1. Solve task batch with current harness.
  2. Collect execution evidence, trajectories, final outputs, scores, and failure signals.
  3. Let evolver update only allowed harness artifacts.
  4. Validate/apply/reload harness.
  5. Repeat and evaluate final performance.
- This is not model fine-tuning and does not update model weights.

### Metrics

- Base capability: task performance with initial harness.
- Pairwise evolution gain: post-evolution performance minus base performance for a given task agent/evolver pairing.
- Harness-updating capability: average gain produced by an evolver across anchor task agents.
- Harness-benefit capability: best gain a task agent obtains from anchor evolvers.

### Benchmarks / Artifacts

- Benchmarks: SWE-bench Verified, MCP-Atlas, SkillsBench.
- Experimental harness scopes:
  - SWE + SkillsBench: skills only.
  - MCP-Atlas: prompts, skills, append-only memory.
  - Tools were treated as read-only in the reported experiments.
- Models include Claude Opus/Sonnet/Haiku tier models, Qwen models, GPT-OSS-120B, and an additional smaller evolver in some analysis.

### Empirical Conclusions

- Harness-updating is relatively flat across model base capability tiers.
- Post-evolution task-solving performance is largely dominated by the task-solving agent's base capability.
- Harness-benefit is non-monotonic: weak agents benefit little, mid-tier agents benefit most, frontier/strong agents often benefit less because of ceiling effects.
- Weak agents underuse harnesses due to:
  - activation failure: not loading/invoking the relevant prompt/skill/memory/tool;
  - adherence failure: loading it but not following it faithfully during long trajectories.
- Design implication: do not spend all budget on a powerful evolver; ensure the task agent can activate and follow updated harness artifacts.

### Risks / Limitations from Paper

- Persistent harness updates can encode false lessons, unsafe tool-use policy, bias, or sensitive data.
- Real systems need privacy, consent, reversibility, auditability, and human oversight.
- Paper does not evaluate base-model fine-tuning or autonomous production code mutation.

## Public Implementation Findings (`A-EVO-Lab/a-evolve`)

| File / Component | Observed Responsibility | Design Implication |
| --- | --- | --- |
| `agent_evolve/contract/manifest.py` | Manifest declares evolvable layers such as prompts, skills, memory, tools and reload strategy. | Useful reference; AutoByteus MVP is intentionally simpler and feature-gated direct edit. |
| `agent_evolve/contract/workspace.py` | Workspace reads/writes prompts, skills, tools, memory JSONL. | Supports direct workspace/harness edits; AutoByteus MVP can use Git-backed direct skill edits. |
| `agent_evolve/engine/loop.py` | Evolution loop: solve, observe, export snapshot, pre/post git commits/tags, engine step, reload, convergence/stop. | AutoByteus needs an explicit evolution-cycle owner. |
| `agent_evolve/algorithms/unified/controller.py` | Chooses recipes/scopes based on evidence/regime. | AutoByteus can start simpler with fixed MVP scopes. |
| `agent_evolve/algorithms/unified/engine.py` | Runs readers/operators/verifier, enforces artifact scope, persists metadata, supports rollback. | Validation and rollback should be first-class. |
| `agent_evolve/algorithms/unified/operators/llm_bash_evolve.py` | Gives an evolver scoped workspace access and restores out-of-scope writes after the call. | Supports the latest MVP preference to use existing shell/run_bash rather than custom evolver tools. |
| `agent_evolve/algorithms/unified/verifiers/stagnation_rollback.py` | Example verifier can roll back based on stagnation/pass-rate signal. | Benefit validation should be separate from update generation. |
| `agent_evolve/engine/versioning.py` | Git init/commit/tag/rollback/diff/log for workspace evolution. | AutoByteus can reuse skill versioning but needs analogous provenance for definitions/memory. |

## Current Behavior / Current Flow in AutoByteus

### Agent and Team Definition Flow

- Agent definitions include name, role, description, instructions, tool names, processor lists, skill names, source/ownership metadata, and default launch config.
- Shared file-backed agents are stored as `agent.md` plus `agent-config.json`; application-owned/team-local scopes have dedicated path logic and integrity checks.
- Team definitions store team instructions, graph nodes, coordinator member, source/ownership metadata, and config.
- Services own validation and update operations for agent/team definitions and other non-skill surfaces. MVP direct skill-file mutation intentionally bypasses a service-mediated apply path only under the feature-gated direct-edit strategy.

### Runtime Prompt / Skill / Tool Injection Flow

- Runtime `AgentConfig` holds the system prompt, configured tools, processors, skills, skill access mode, and memory directory.
- System prompt processing composes the base system prompt and processor output.
- Available skills are injected or advertised based on `SkillAccessMode`:
  - `PRELOADED_ONLY`: configured skills can be injected/available deterministically.
  - `GLOBAL_DISCOVERY`: skills are discoverable and `load_skill` can be used.
- Tool manifests are injected by prompt processors for non-API tool-call mode.
- Request assembly appends processed system prompts and manages working context/compaction.

### Skill Flow

- Runtime can load skills from registered paths and expose `load_skill`.
- Server can discover, create, update, delete, enable/disable, and version skills.
- Configured skill resolver maps single-segment skill names safely through agent-private, colocated, team-shared, or global sources.
- Codex and Claude backends materialize configured skills into workspace-specific `.codex/skills` / `.claude/skills` symlink trees.

### Memory / Evidence Flow

- Runtime memory manager stores raw traces, working context snapshots, semantic/episodic memory, tool intents/results, assistant responses, and compaction artifacts.
- Server runtime-memory recorder captures external runtime events into memory directories.
- Run history projection transforms raw traces into historical replay events.
- These are suitable evidence sources for evolution, but must be redacted/minimized.

### Tool / MCP Flow

- Tool registry owns built-in and MCP-discovered tool definitions.
- MCP registrar/config services can discover/import/register/delete MCP server configs.
- Because tools can create external side effects, MVP self-evolution should not auto-mutate tool/MCP configuration.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Feature Investigation
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / Missing Invariant
- Refactor posture evidence summary: Core substrate exists. Avoid runtime refactor for MVP; add an evolution-cycle owner that launches the visible direct-edit evolver run and records provenance/post-run state.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Paper | Evolution is a loop with manifest, evidence, artifact scope, validation, and benefit measurement. | AutoByteus design needs a similar explicit cycle owner. | Formal design if approved. |
| Paper findings | Task agent's activation/adherence is as important as update generation. | AutoByteus must measure skill activation and avoid relying only on global discovery. | Add metrics in future design. |
| Agent/team services | Existing services own definitions and perform validation/scope checks. | Evolver should not write definition files directly. | Route apply through services. |
| Skill services | Skills already have discovery, update, and versioning. | Skills are best MVP artifact family. | MVP direct-edits files inside skill roots; future stricter mode can integrate service-mediated apply. |
| Memory/run history | Evidence substrate exists but may contain sensitive data. | Add evidence extractor/redactor/minimizer. | Define privacy gate. |
| MCP/tool services | Tools have external side effects. | MVP should be proposal/recommendation-only for tools/MCP. | Defer auto-apply. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-definition/domain/models.ts` | Agent definition model. | Contains instructions, tools, processors, skills, ownership/source metadata. | Prompt/instruction harness target. |
| `autobyteus-server-ts/src/agent-definition/services/agent-definition-service.ts` | Agent definition CRUD/update/duplicate. | Service boundary exists. | Self-evolution apply should call this service. |
| `autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts` | File-backed agent persistence. | Writes `agent.md` and `agent-config.json`; enforces source paths/scopes. | Do not bypass with raw writes. |
| `autobyteus-server-ts/src/agent-team-definition/domain/models.ts` | Team definition model. | Contains instructions, nodes, coordinator, ownership/source metadata. | Team prompt harness target. |
| `autobyteus-server-ts/src/agent-team-definition/services/agent-team-definition-service.ts` | Team validation/update. | Validates graph/coordinator/scope. | Apply through service only. |
| `autobyteus-ts/src/agent/context/agent-config.ts` | Runtime agent configuration. | Holds system prompt, tools, processors, skills, skill access, memory dir. | Harness updates enter runtime here. |
| `autobyteus-ts/src/agent/bootstrap-steps/system-prompt-processing-step.ts` | Prompt processing at bootstrap. | Runs system-prompt pipeline and configures LLM. | Good dry-run validation point. |
| `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts` | Skill prompt injection/discovery instructions. | Determines activation mode. | Critical for activation/adherence. |
| `autobyteus-ts/src/agent/system-prompt-processor/tool-manifest-injector-processor.ts` | Tool manifest injection. | Exposes accessible tools to agent. | Tool metadata can be harness context; tool config mutation risky. |
| `autobyteus-ts/src/agent/llm-request-assembler.ts` | Working context and system prompt assembly. | Ensures prompt enters conversation context. | Updated prompts can be validated through assembly. |
| `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` | Main agent loop. | Emits events, handles LLM/tool cycles and memory ingestion. | Evidence source; avoid MVP mutation here. |
| `autobyteus-ts/src/memory/memory-manager.ts` | Runtime memory manager. | Records raw traces, working context, semantic/episodic memory. | Evidence source and possible memory target. |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | File store for run memory. | Stores raw traces and snapshots. | Evidence extraction input. |
| `autobyteus-server-ts/src/agent-memory/services/agent-run-memory-recorder.ts` | External runtime memory recording. | Hooks runtime events into run memory. | Makes Codex/Claude evidence available. |
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts` | Converts runtime events to raw traces. | Tracks tool calls/results, messages, reasoning, compaction. | Evolution evidence source. |
| `autobyteus-server-ts/src/run-history/projection/providers/local-memory-run-view-projection-provider.ts` | Builds run projection from raw memory traces. | Higher-level replay view. | Useful evidence extractor input. |
| `autobyteus-ts/src/skills/loader.ts` | Parses `SKILL.md`. | Skill parse validation. | Use for proposal validation. |
| `autobyteus-ts/src/skills/registry.ts` | Runtime skill registry. | Lists/discovers registered skills. | Activation and discovery surface. |
| `autobyteus-ts/src/tools/skill/load-skill.ts` | Runtime skill load tool. | Enforces skill access mode. | Activation metrics can inspect tool use. |
| `autobyteus-server-ts/src/skills/services/skill-service.ts` | Skill CRUD and configuration. | Existing update owner, respects readonly paths. | Primary apply boundary for skill evolution. |
| `autobyteus-server-ts/src/skills/services/skill-versioning-service.ts` | Per-skill git versioning. | Version create/diff/activate. | Reuse for rollback/provenance. |
| `autobyteus-server-ts/src/skills/services/configured-agent-skill-resolver.ts` | Resolves configured agent skills. | Scope-aware skill resolution. | Validation must ensure proposed skill is reachable by target agent. |
| `autobyteus-ts/src/tools/registry/tool-registry.ts` | Tool registry. | Central built-in/MCP tool registry. | Inspect only for MVP. |
| `autobyteus-ts/src/tools/mcp/tool-registrar.ts` | MCP remote tool registration. | Registers/unregisters discovered MCP tools. | Auto-mutation risky. |
| `autobyteus-server-ts/src/mcp-server-management/services/mcp-config-service.ts` | MCP config service. | Manages MCP configs and syncs registrar. | Proposal-only in MVP. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Builds AutoByteus runtime agent config. | Resolves definitions, skills, tools, memory dir. | Future dry-run/validation can build config. |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-agent-config-builder.ts` | Builds team member agent configs. | Team definitions become runtime configs. | Team evolution must validate member configs. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Codex backend prompt/skill setup. | Composes instructions and materializes configured skills. | External runtime activation/adherence consideration. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts` | Codex skill symlinking. | Configured skills are real external-runtime harness. | Future evolution must update configured skills, not workspace symlinks. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` | Claude backend prompt/skill setup. | Composes instructions and materializes skills. | External runtime compatibility. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts` | Claude skill symlinking. | Configured skills are exposed to Claude runtime. | Same as Codex. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-02 | Static code investigation | `rg`, `sed`, `git`, local PDF/text extraction, external repo clone | No runtime execution was needed for feasibility; no application behavior was changed. | Next phase should add executable validation only after formal design/implementation. |

## External / Public Source Findings

- Public paper: arXiv:2605.30621, submitted 2026-05-28.
- Public code: `A-EVO-Lab/a-evolve`, branch `release/harness-evolution`.
- Relevant contract learned: harness self-evolution updates external artifacts only; it needs scope control, evidence, validation, versioning, and rollback.
- Why it matters: AutoByteus already has matching external artifacts and evidence stores. Latest MVP uses a central launcher/minimal-run-record owner plus feature-gated Git-backed direct edits rather than a full proposal/apply service.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for investigation.
- Required config, feature flags, env vars, or accounts: None for investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation:
  - PDF: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/in-progress/self-evolving-harness-feasibility/external-paper/arxiv-2605.30621.pdf`
  - Extracted paper text: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/in-progress/self-evolving-harness-feasibility/external-paper/arxiv-2605.30621.txt`
  - External code clone: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/.tmp_external/a-evolve`
- Setup commands that materially affected the investigation: Dedicated worktree creation; external PDF download; external code clone.
- Cleanup notes for temporary investigation-only setup: `.tmp_external/a-evolve` is investigation-only and should not be committed.

## Findings From Code / Docs / Data / Logs

### Feasible Now / Strong Foundation

- Skills can be evolved safely earliest because server-side creation/update and per-skill versioning already exist.
- Agent/team instructions are feasible as proposal targets because definition services already own persistence and validation.
- Evidence extraction is feasible because raw traces and run-history projections already exist.
- Runtime activation can be managed through existing configured skill modes, especially `PRELOADED_ONLY` for critical evolved skills.

### Partially Supported / Needs Design

- Agent/team instruction versioning and rollback are less obvious than skill versioning; future design must add rollback pointers or version history.
- Memory writes need a safe target model: run-scoped, agent-scoped, project-scoped, team-scoped, or global.
- Cross-backend activation/adherence metrics need design because AutoByteus, Codex, and Claude expose prompts/skills differently.
- Benefit measurement needs task outcome/evaluator/user-feedback integration.

### Not Supported Safely in MVP

- Autonomous tool/MCP mutation.
- Direct filesystem writes by an evolver into source repo or app data.
- Model parameter changes/fine-tuning.
- Automatic shared/global artifact mutation outside the explicit feature-gated self-evolution path.

## Constraints / Dependencies / Compatibility Facts

- Requirements/design artifacts must live in the dedicated task worktree.
- No implementation should proceed before requirements approval and architecture review.
- Future design must not create duplicate mutation paths for agent definitions, team definitions, memory, tools, or MCP config.
- MVP direct skill-root edits are allowed only inside explicit target skill root directories under the feature-gated manual self-evolution path; non-skill-root mutations remain out of scope/report-only.
- The future evolution cycle should be explicit and observable, not an incidental side effect of an agent run.

## Open Unknowns / Risks

- What product/UI workflow should users use to inspect visible evolver runs and Git working-tree changes manually?
- What evidence selectors should be available: one run, multiple runs, failed runs, user-rated runs, benchmark suites?
- What privacy policy should govern copying information from run traces into persistent prompts/skills/memories?
- How to prevent overfitting to a single failed run.
- How to define benefit metrics for non-benchmark user tasks.
- Whether evolved skills should default to `PRELOADED_ONLY` or be discoverable depending on scope/importance.
- Whether repository-resident skill changes should go through PR/code review instead of app-data mutation.

## Notes For Architect Reviewer

This earlier handoff note is superseded by later user refinements on 2026-06-05. The current design is centered on a single `SelfEvolutionService` that launches a visible direct-edit evolver run, provides anonymized work-history evidence and skill-root context, records only minimal run provenance, and emits target notification/reload. Dedicated change-recording/audit and metrics services are no longer MVP scope.

## Additional Architecture Analysis — Skill Evolution Bridge — 2026-06-04

The user clarified that the important architectural question is how to connect two existing storage worlds: run traces/history in app-data memory and skill files primarily living in agent packages. Additional analysis produced `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/in-progress/self-evolving-harness-feasibility/skill-evolution-architecture-analysis.md`.

Core conclusion after refinement: the bridge should be a `SkillEvolutionService` / `ExperienceDistillationService` that maps run metadata to agent definitions, resolves configured skills through `SkillService.resolveConfiguredSkillsForAgent`, reads complete trace corpora through memory/run-history readers, and launches a visible evolver agent. For the MVP, the evolver may directly edit files inside target skill roots using existing `run_bash`/shell tooling; the service records minimal visible-run provenance rather than owning a full typed proposal/apply pipeline or post-run Git/change recorder.

Important current gap: run metadata records `agentDefinitionId`, `memoryDir`, `runtimeKind`, and `skillAccessMode`, but does not appear to snapshot the exact resolved skill root paths, skill versions, or content hashes used at run start. For historically accurate evolution, future design should persist `resolvedSkillBindings` at run start.

## Consolidated Product/Architecture Refinements From Discussion — 2026-06-04

The follow-up discussion refined the self-evolution direction from general harness evolution to a concrete, skill-first product architecture.

### Refined Mental Model

- Target agents perform business work and leave raw working traces.
- Traces are analogous to human episodic experience.
- Skills are analogous to distilled strategy/procedure.
- Self-evolution is a reflection loop: experience is periodically reviewed and distilled into better skills.
- The evolver can be implemented as a normal AutoByteus agent or agent team, but it should act as a reflection/evolution worker, not as part of the target agent's normal business cognition unless explicitly requested.

### Skill-First Scope

The user clarified that AutoByteus agents use small system prompts and rely heavily on skills to define actual working behavior. Tools are comparatively few and business-domain determined. Therefore the MVP should focus on skill evolution:

- create new skills from repeated experience patterns;
- update existing skills based on trace evidence and feedback;
- split overloaded skills;
- merge duplicate/overlapping skills;
- improve activation guidance;
- attach an existing/new skill to the target agent when appropriate;
- optionally retire/disable stale or harmful skills after review.

Prompt/instruction updates and memory lessons can remain secondary report-only surfaces. Tool/MCP mutation should remain out of MVP except as recommendations.

### Current Backend Connection Between Traces And Skills

Relevant trace/experience side:

- `AppConfig.getMemoryDir()` returns `<app-data-dir>/memory`.
- Standalone run memory lives under `memory/agents/<runId>/`.
- Team member memory lives under `memory/agent_teams/<teamRunId>/<memberRunId>/`.
- Important files include `run_metadata.json`, `team_run_metadata.json`, `raw_traces.jsonl`, archive segments, and `working_context_snapshot.json`.
- `AgentRunMemoryLayout`, `TeamMemberMemoryLayout`, `RunMemoryFileStore`, `AgentMemoryService`, and `LocalMemoryRunViewProjectionProvider` provide the existing read paths.

Relevant skill/strategy side:

- Global/app-data skills: `<app-data-dir>/skills/<skillName>/SKILL.md`.
- Agent-private skills: `agents/<agentId>/skills/<skillName>/SKILL.md`.
- Team-shared skills: `agent-teams/<teamId>/skills/<skillName>/SKILL.md`.
- Imported agent-package skills are discovered via `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`.
- `AgentDefinition.skillNames` is the logical skill binding for target agents.
- `SkillService.resolveConfiguredSkillsForAgent(agentDefinition)` is the important bridge from target agent definition to concrete skill root paths.

Proposed bridge:

```text
runId / teamRunId+memberRunId
  -> run metadata / team metadata
  -> agentDefinitionId
  -> AgentDefinition.skillNames
  -> SkillService.resolveConfiguredSkillsForAgent(...)
  -> concrete skill root paths + current skill content/version
  -> visible EvolverAgent receives exact editable skill root paths plus primary SKILL.md paths
  -> EvolverAgent uses run_bash/shell to edit files inside those skill roots directly
  -> minimal record links source run to visible evolver run
```

Important gap identified: run metadata currently records `agentDefinitionId`, `memoryDir`, `runtimeKind`, and `skillAccessMode`, but does not appear to snapshot the exact resolved skill root paths, skill versions, or skill content hashes used at run start. A future design should add a `resolvedSkillBindings` snapshot to make evolution historically accurate.

### Visible Evolver Run, Not Invisible Background First

The user clarified that the initial product should make the evolver visible in the UI, similar to the current memory compaction agent. This is important for observability and debugging. The compaction pattern is relevant:

- `ServerCompactionAgentRunner` creates a normal visible `AgentRun`.
- It posts a structured task message.
- It subscribes to events and collects output.
- It records activity and terminates the helper run.

Recommended analogous MVP:

```text
SkillEvolutionRunner
  -> create visible EvolverAgent or EvolverTeam run
  -> post anonymized work-history digest + exact editable skill roots + direct-edit rules
  -> evolver directly edits files inside target skill roots using run_bash/shell
  -> record minimal visible evolver run linkage
  -> notify/reload target after successful evolver completion
```

The evolver may be a normal agent/team and shown in the frontend, but it should be a separate reflection/evolution run rather than a member of the target agent's normal business team by default.

### Why Not Put Evolver In Target Team By Default

Ordinary team membership currently exposes team context, member rosters, and `send_message_to` semantics to members. If the target agent and evolver are put in the same synthetic team just to enable messaging, the target may become aware of the evolver and change behavior: delegate to it, mention it, or treat the business task as a team collaboration. That pollutes the target business traces and changes product semantics.

Recommended default topology:

```text
Business execution plane:
  target agent/team runs normally

Reflection/evolution plane:
  visible EvolverAgent/EvolverTeam run analyzes traces

Control plane:
  SkillEvolutionService connects evidence, direct skill-root edit orchestration, minimal run provenance, and reload notification
```

A `visible coach` mode, where the evolver is intentionally visible as a teammate, can be a later explicit product mode, not the default self-evolution behavior.

### Target-Agent Notification / Reload After Applied Update

The user identified that after a skill is improved and applied, the target agent should be notified so it can reload/adopt the new strategy. This is correct because active runs may cache skill state:

- Native runtime registers skills into singleton `SkillRegistry` at runtime creation/restoration.
- `AvailableSkillsProcessor` injects skills into processed system prompt at bootstrap.
- The working context may already contain old skill details.
- `load_skill` can return cached registry skill content.

Therefore, writing `SKILL.md` is sufficient for future runs but not necessarily for active runs.

Recommended target notification/reload flow:

```text
successful EvolverAgent completion
  -> SelfEvolutionService records source/evolver run linkage and affected skill roots
  -> skill-update notification/reload request emitted
  -> ActiveRunSkillReloadService or equivalent finds affected active runs
  -> if inactive: no live notification; next run uses new skill
  -> if active and idle: refresh supported skill state and send system notification
  -> if active and busy: queue reload/notification until idle
```

MVP can use existing run-posting semantics for the LLM-visible part:

```text
run.postUserMessage(
  new AgentInputUserMessage(content, SenderType.SYSTEM, null, metadata)
)
```

The existing input pipeline recognizes `SenderType.SYSTEM` and surfaces system task notifications. Longer term, add a dedicated `SkillUpdatedEvent` / `SkillReloadRequestedEvent` runtime control event so internal reload and LLM-visible notification are separate.

Recommended system notification content:

```text
System notification: your skill '<skillName>' has been updated to version '<version>'.
Reason: <evidence-grounded diagnosis>.
New strategy summary: <operational summary>.
Please reload/use the updated skill for future work.
```

### Recommended MVP Position

The refined MVP should be:

```text
visible compaction-style SkillEvolutionRunner
  + skill-first EvolverAgent/EvolverTeam
  + direct edits inside target skill roots through existing run_bash/shell tooling
  + manual-click consent plus feature toggle off by default
  + minimal source/evolver run provenance only; no MVP change recorder
  + target run SkillUpdatedEvent / SenderType.SYSTEM notification
  + next-run correctness by default; active-run reload queued when safe
```

This preserves observability, keeps target agents focused on business tasks, and avoids hiding evolution behavior while still allowing self-improvement through visible, inspectable agent runs.

## Trigger / UX Refinement — 2026-06-04

The user asked whether evolution should be user-triggered, system-triggered, cron-like, or triggered by the self-evolver itself. Earlier notes considered agent-level settings and automatic launch, but this has been superseded: self-evolution eligibility belongs to run-launch configuration and run/member metadata snapshots, and `manual_only` is the only executable MVP trigger. Do not let the evolver independently self-trigger; trigger authority should live in an orchestration policy/service. Cron/batch and feedback-specific triggers can come later after evidence selection and dedupe mature.

## Trigger Mode Refinement — Manual First-Class Plus Scheduled — 2026-06-04

The user clarified that manual trigger should be first-class, likely dominant in early usage, because users know when an agent behaved badly or received corrective feedback and can simply click an "improve" action. Final refined recommendation: implement only manual trigger in MVP. Scheduled/cron and signal-based triggers should remain explicit not-implemented placeholders in the strategy catalog and should reuse the same `EvolutionRequest` path later.

## Strategy-Pluggable Settings Refinement — 2026-06-04

The user endorsed a strategy split: trigger strategy decides when evolution runs; evolver strategy decides who/how performs the reflection work. This should be configurable in Settings, analogous to compaction settings. MVP can start with `manual_only` trigger + `single_agent` evolver strategy. Later, trigger strategies can add scheduled/signal strategies and evolver strategies can add agent-team implementations. A built-in default skill evolver agent can be seeded as a normal shared agent definition and selected by setting, similar to `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` for Memory Compactor.

## MVP Simplification Refinement — 2026-06-04

The user pushed back that the MVP should not expose separate approval and notification strategies. Refined recommendation: keep only essential user-facing configuration: self-evolution enabled, trigger strategy (manual/scheduled), and default evolver agent. For manual trigger, the user's click should count as consent to run the visible direct-edit evolver. The evolver may edit files inside target skill roots directly via `run_bash`; the feature is off by default and rollback/testing is Git-backed. Notification/reload should be default system behavior after apply, not a configurable strategy: record a skill-updated notification, deliver a `SenderType.SYSTEM` message/reload to an active idle target run, queue if busy, and rely on next-run updated skills if the target is not active.


## Manual-First Strategy Architecture Refinement — 2026-06-04

The user clarified that configuration should make a target eligible for self-evolution, but the first implementation should focus on manual trigger only. Enabling self-evolution in an agent/team/run configuration should expose a manual self-evolve action; it should not require implementing automatic cron/signal behavior immediately. The architecture should still use strategy-shaped boundaries so automatic scheduled/signal triggers can be plugged in later.

Recommended MVP interpretation:

```text
SelfEvolutionEffectiveConfig.enabled = target eligible after scope override resolution/snapshot
triggerStrategy = manual_only       # implemented first
evolverStrategy = single_agent # implemented first
```

Manual flow:

```text
run configuration enables self-evolution
  -> run proceeds normally
  -> when idle/completed, UI shows Improve from this run
  -> click creates EvolutionRequest
  -> SkillEvolutionRunner launches visible single evolver agent
  -> evolver edits files inside target skill roots directly via run_bash/shell
  -> service records run/post-run status where practical
```

Future scheduled/cron or signal-based triggers should reuse the same `EvolutionRequest` and `SkillEvolutionRunner` path. They should not require changing target-agent team membership and should not be implemented in the first slice unless explicitly selected later.


## Future Trigger Strategy Placeholder Refinement — 2026-06-04

The user clarified that scheduled and signal trigger strategies should remain in the architecture as explicit future placeholders. MVP still implements only manual trigger. Recommended catalog:

```text
ManualTriggerStrategy: implemented in MVP
ScheduledTriggerStrategy: not implemented placeholder
SignalTriggerStrategy: not implemented placeholder
```

The not-implemented strategies should not be selectable/executable in MVP. Their purpose is to document the extension point and ensure future cron/signal behavior reuses the same `EvolutionRequest` and `SkillEvolutionRunner` path rather than creating a separate flow.

## Compaction-Style Evolver Launch Context Refinement — 2026-06-04

The user clarified that self-evolver runs should learn from the compaction-agent launch pattern. Current code inspection confirms the relevant compaction behavior:

- `autobyteus-server-ts/src/agent-execution/compaction/server-compaction-agent-runner.ts` creates a normal visible agent run through `AgentRunService.createAgentRun(...)`.
- The runner receives the parent run `workspaceRootPath`; if absent, it falls back to the temp workspace directory.
- The compaction runner currently passes `autoExecuteTools: false`, `skillAccessMode: SkillAccessMode.PRELOADED_ONLY`, and the resolved runtime/model into the helper run. For self-evolution, the user clarified the evolver should instead use `autoExecuteTools: true` because the user is not expected to interact with tool approvals during this helper run.
- `autobyteus-server-ts/src/agent-execution/compaction/compaction-agent-settings-resolver.ts` resolves the selected compactor agent, uses its explicit default launch config when present, and otherwise falls back to the parent run runtime/model via `parentLaunchFallback`.
- `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` wires the parent run's `workspaceRootPath`, effective runtime kind, and model identifier into the compaction runner factory.

Recommended self-evolution equivalent:

```text
SkillEvolutionRunner
  -> receives target run launch context:
       workspaceRootPath
       runtimeKind
       llmModelIdentifier
       sourceAgentDefinitionId
  -> resolves configured evolver agent
  -> creates visible evolver AgentRun using target workspaceRootPath
  -> if no custom self-evolution model/runtime override is configured, falls back to target run runtime/model
  -> evolver run has its own memory/run ID; target traces and skill snapshots are provided as evidence, not as shared mutable memory
```

The target workspace is inherited for context parity, UI/debuggability, and direct skill edits in the simplified MVP. Rollback/testing is primarily Git-backed; the service should still record the evolver run and post-run state where practical.


## Evolver Auto-Execute Tools Refinement — 2026-06-04

The user clarified that the self-evolver agent should run with `autoExecuteTools: true`. Rationale: the self-evolver is a visible helper run, but the user is not expected to interact with it or approve individual tool calls. The design should rely on feature gating, visible runs, Git-backed rollback/testing, and avoiding custom tool proliferation rather than per-tool approval.

Recommended constraint:

```text
Evolver AgentRun: autoExecuteTools = true
Evolver allowed tools: existing run_bash/shell for reading and editing files inside target skill roots
Durable skill apply: direct file edits in MVP; service records run/post-run state
```

## Evolver Tool Boundary Refinement — 2026-06-04

The user asked whether the evolver needs file tools to update the skill file, and whether `autoExecuteTools: false` would otherwise require manual user approval. The latest refinement supersedes the prior no-direct-write recommendation: for MVP, the evolver should use `autoExecuteTools: true` plus the existing `run_bash`/shell capability and may directly update files inside the listed skill roots.

This keeps the UX non-interactive while preserving safety:

```text
Evolver: auto-executed `run_bash`/shell commands may edit files inside listed skill roots directly
Service: launches run, provides paths/context, records run/post-run state where practical
Rollback/testing: Git-backed skill packages + feature toggle off by default
```

Do not create custom `emit_skill_change`/patch tooling for MVP unless later evidence proves it is needed. Simplicity is preferred: direct file edits through existing shell tooling are acceptable while the feature is off by default and under testing.


## Direct-Edit Simplicity Refinement — 2026-06-04

The user clarified they do not want a complex custom tool surface for the evolver. Use the existing `run_bash`/shell tool, set evolver `autoExecuteTools: true`, and let the evolver directly update files inside listed skill roots. The feature is globally disabled by default; when disabled the UI should not expose self-evolution controls in agent/team configuration. During testing, the user can enable it, run manual self-evolution, inspect the resulting Git working tree, and revert if needed. This shifts the MVP safety/rollback boundary from service-mediated patch apply to feature-gated Git-backed direct edits.


## Run Bash Tool Availability Check — 2026-06-04

Read `autobyteus-ts/src/tools/terminal/tools/run-bash.ts` and `autobyteus-ts/src/tools/register-tools.ts`. Findings: `run_bash` is registered by `registerRunBashTool()`, is named exactly `run_bash`, executes stateless non-interactive shell commands, and accepts optional `cwd`; absolute paths are supported by the argument schema/description. Design implication: the default self-evolver agent can use existing `run_bash` if its agent definition includes that tool, and the evolution service should pass exact absolute skill root directories plus primary `SKILL.md` paths because skill roots may live outside the target workspace root and may contain supporting files.

## Readiness Audit — 2026-06-04

Re-read and consistency-checked the current requirements, investigation notes, and architecture analysis after the latest direct-edit simplification. Also re-checked `run_bash` availability in `autobyteus-ts/src/tools/terminal/tools/run-bash.ts` and `autobyteus-ts/src/tools/register-tools.ts`.

Readiness conclusion: investigation is sufficient to start the formal design spec for the manual-first MVP. The design should be scoped to:

```text
Global feature toggle off by default
  -> self-evolution controls hidden unless enabled
ManualTriggerStrategy only implemented
  -> ScheduledTriggerStrategy and SignalTriggerStrategy remain not-implemented placeholders
EvolverStrategy = single visible evolver agent
  -> compaction-style run creation
  -> target workspace context
  -> target runtime/model fallback when no custom evolver model is configured
  -> autoExecuteTools: true
  -> built-in/default evolver agent has run_bash access
  -> exact absolute skill root directories plus primary SKILL.md paths are supplied in the evolution task
  -> evolver directly edits target skill-root files via run_bash/shell
Post-run service responsibilities
  -> record evolver run/provenance
  -> optionally record git status/diff/changing paths
  -> notify/reload target if changed/assumed changed
Rollback/testing
  -> Git-backed inspection/revert; no custom proposal/apply tool in MVP
```

Remaining questions are design-detail questions rather than investigation blockers:

- exact settings/config schema and capability gating path;
- exact UI surfaces and button enablement conditions;
- exact `EvolutionRequest` and run-record fields;
- exact built-in self-evolver agent definition/prompt and `toolNames`;
- how much, if any, changed-file detection should be added in a future stricter strategy;
- whether active-run reload is next-run-only for MVP or sends queued `SenderType.SYSTEM` notification when idle;
- how to handle read-only skill roots in the direct-edit MVP; non-Git rollback remains a product/testing process risk, not a service-audit requirement.

Recommendation: mark requirements ready for user approval and then produce the formal design spec. Do not hand to architecture reviewer until the design spec is written from these approved requirements.


## Formal Design Approval And Artifact Update — 2026-06-04

The user explicitly approved moving from investigation/refinement into comprehensive formal design with: “Let’s go! Let’s just please do comprehensive really really good design.” The requirements document was updated to `Design-ready — user-approved`, and the formal design artifact was produced at:

`/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/in-progress/self-evolving-harness-feasibility/design-spec.md`

The design keeps the latest refined MVP boundary:

```text
feature toggle off by default
manual_only trigger implemented
scheduled and signal_based trigger strategies as not-implemented placeholders
single_agent evolverStrategy implemented
agent_team evolverStrategy as not-implemented placeholder
visible evolver AgentRun, separate from target team membership
compaction-style workspace/runtime/model fallback
autoExecuteTools: true
default built-in self-evolver has run_bash
exact absolute target skill root directories plus primary SKILL.md paths in task prompt
direct skill-root file edits via run_bash
post-run provenance/Git summary where practical
default target notification/reload attempt; next-run correctness baseline
```

No further investigation blocker remains before architecture review. Remaining questions are implementation details already represented in the design as explicit tradeoffs, risks, and validation points.

## Architecture Review Round 1 Rework — 2026-06-04

Architecture review round 1 failed the design on three blocking items, recorded in `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/in-progress/self-evolving-harness-feasibility/design-review-report.md`:

- AR-001: missing concrete metrics contract for harness-updating versus harness-benefit.
- AR-002: ambiguous agent/team/run eligibility configuration semantics.
- AR-003: `manual_only` trigger strategy named but not given a concrete implementation boundary.

The revised requirements and design now address these as follows:

```text
AR-001 response superseded by later user scope correction:
  Earlier design added a metrics service, but the 2026-06-05 user refinement removes dedicated MVP metrics/reporting.
  Final MVP keeps the paper distinction as future work and prevents UI from claiming benefit from evolver completion.

AR-002 response:
  Initially added definition/team/run scoped overrides, then revised after user correction.
  Final direction: add SelfEvolutionRunConfigOverride and SelfEvolutionEffectiveConfig.
  Add SelfEvolutionEffectiveConfigResolver.
  Define precedence:
    standalone: default -> AgentRunConfig.selfEvolution -> AgentRunMetadata snapshot
    team member: default -> TeamRunConfig.selfEvolution -> TeamMemberRunConfig.selfEvolution if available -> TeamRunMemberMetadata snapshot
  Do not add selfEvolution to AgentDefinition or TeamDefinition in MVP.
  Old runs with no snapshot are ineligible.
  Manual start uses run metadata snapshot, not current mutable definitions.

AR-003 response:
  Add ManualTriggerStrategy as the executable manual_only trigger owner.
  GraphQL start mutations call through ManualTriggerStrategy.createRequest(...).
  Future scheduled/signal triggers must produce the same SelfEvolutionRequest and call SelfEvolutionService.startFromEvolutionRequest(...).
```

The design spec was updated in place and is ready for architecture review round 2.


## User Design Correction — Self-Evolution Is Runtime Config, Not Agent Definition Attribute — 2026-06-04

After architecture review round 2 was requested, the user pointed out an important design smell: making `selfEvolution` an attribute on `AgentDefinition` or `TeamDefinition` feels strange because self-evolution is not part of the agent's durable business identity. It is more naturally a runtime/control-plane configuration or run metadata concern.

Revised design direction:

```text
Global capability setting
  -> standalone/team run-launch selfEvolution config
  -> SelfEvolutionEffectiveConfigResolver
  -> run/member metadata snapshot
  -> manual eligibility/start reads snapshot
```

Do not add MVP `selfEvolution` fields to `agent-config.json`, `AgentDefinition`, `team-config.json`, or `TeamDefinition`. Agent/team definitions continue to provide target identity and configured skills, which the self-evolution service reads after a run is selected. If persistent defaults are needed later, they should be modeled as run presets or launch preferences, not intrinsic agent/team definition attributes.


## User Design Correction — Skill Evolution Targets Skill Folders, Not Only SKILL.md — 2026-06-05

The user pointed out that the latest `origin/personal` canonical agent package skill layout supports multiple configured skills per agent and each skill is a folder/package, not merely one `SKILL.md` file. Source inspection of `origin/personal` confirmed canonical package skill folders such as:

```text
agents/<agent-id>/skills/<skill-name>/SKILL.md
agent-teams/<team-id>/agents/<agent-id>/skills/<skill-name>/SKILL.md
agent-teams/<team-id>/skills/<skill-name>/SKILL.md
```

Design correction:

- The self-evolution service should resolve all configured skills for the selected target agent/member.
- Each resolved skill target should provide an exact editable `skillRootPath` plus primary `skillMdPath`.
- The evolver may edit files only inside listed skill roots, not only `SKILL.md`. Supporting references/templates/examples inside the root are in scope when a reusable improvement warrants them.
- The evolver must not edit sibling skills, agent/team definitions, run memory, source code, or config outside the listed roots.
- If a new skill or agent `skillNames` change appears necessary, the evolver should report it as a recommendation rather than applying it in MVP.
- The built-in self-evolver instruction and per-run task message should use a human-learning / experience-distillation frame and avoid unnecessary product-internal branding such as starting with “AutoByteus Skill Self-Evolver.”
- The evolver should not receive raw trace internals in the prompt. Raw run traces should first be projected into an anonymized, human-readable work-history digest, similar to the compaction agent's message/tool-output rendering. Prompt-facing evidence should omit bookkeeping identifiers such as turn IDs, sequence IDs, trace IDs, tool-call IDs, provider event IDs, raw JSON trace payloads, and raw trace file paths. Exact editable skill root paths remain unredacted because they are the operational edit boundary.

Note on base refresh: `origin/personal` was fetched and inspected. The ticket worktree currently contains substantial downstream implementation/delivery changes, so the branch was not rebased in-place during this design discussion to avoid disrupting the dirty worktree. The latest source facts were read directly from `origin/personal`.


## User Simplification — No Change Recorder Or Metrics Service In MVP — 2026-06-05

The user rejected the extra `ChangeRecorder`/audit and metrics-service machinery as redundant for the initial direct-edit MVP. Updated interpretation:

- The self-evolver is a capable agent receiving exact editable skill root directories and explicit instructions to edit only inside those roots.
- The MVP should trust that instruction boundary instead of adding a separate changed-path auditor.
- Git remains the testing/revert surface, but the product service does not need to compute changed paths, diff stats, or off-target edits in MVP.
- Formal harness-updating/harness-benefit metrics are valuable research/product concepts but should not be built as an MVP service.
- The simplified flow is: manual user trigger -> visible evolver run -> anonymized work-history digest + exact skill roots -> direct skill-root edits via run_bash -> minimal source/evolver run provenance -> default target notification/reload.

The requirements and design spec were revised locally for this simplification. Per the user's instruction, this latest revision has not been sent back to architecture review yet.

## Architecture Review Rework — Runtime Config And Raw Trace Path Cleanup — 2026-06-05

Fresh architecture review failed the latest simplified design on two narrow contradictions:

- AR-002 reopened: implementation-facing guidance still implied manual start could accept config overrides or that agent/team definition update surfaces might carry `selfEvolution`.
- AR-004: evidence/provenance contracts still retained `runMetadataPath` / raw trace path references, conflicting with the anonymized-evidence and minimal-provenance MVP boundary.

Design corrections made locally:

- `startAgentRunSelfEvolution` / `startTeamMemberSelfEvolution` use only target identity and the existing run/member metadata snapshot; they do not accept config overrides.
- Only run-launch/team-run/member-run launch surfaces may carry `selfEvolution`; agent/team definition update surfaces must not carry it in MVP.
- Precedence examples now use `default disabled -> run-launch override -> run metadata snapshot`, with no agent-definition layer.
- `SelfEvolutionEvidencePackage` no longer contains `runMetadataPath`, `rawTracePathsForRecordOnly`, or any raw trace path retention field.
- The MVP evidence/provenance contract now keeps only source run IDs, anonymized work-history evidence, feedback signals, privacy warnings, and optional evidence hash; raw trace paths are not retained in the default evidence package or evolution record.

The narrow rework keeps the rest of the accepted design direction intact: visible single-agent evolver run, skill-root/package edit scope, anonymized work-history projection, runtime/run-launch ownership, no MVP change-recorder/audit, and no MVP metrics service.
