# Skill-First Self-Evolution Architecture Analysis

## User Framing

The target agent behaves like a human worker: it performs tasks, uses skills, and leaves raw working traces. Later, an evolver/reflection agent or team reviews those traces, detects repeated experience patterns and feedback signals, and distills improved strategy back into skills. In this framing:

- raw traces / run history = episodic working experience;
- skill files = durable procedural strategy;
- evolver agent/team = reflective learning process;
- evolution service = system boundary that connects experience to strategy safely.

## Current Code Architecture: The Two Data Sources

### 1. Experience Source: Run Memory / Raw Traces

Canonical app-data root is `AppConfig.getAppDataDir()`. Server memory root is:

```text
<app-data-dir>/memory
```

Key storage layout:

```text
memory/
  run_history_index.json
  team_run_history_index.json
  agents/<runId>/
    run_metadata.json
    raw_traces.jsonl
    raw_traces_archive_manifest.json
    raw_traces_archive/*.jsonl
    working_context_snapshot.json
    episodic.jsonl
    semantic.jsonl
  agent_teams/<teamRunId>/
    team_run_metadata.json
    <memberRunId>/
      raw_traces.jsonl
      raw_traces_archive_manifest.json
      raw_traces_archive/*.jsonl
      working_context_snapshot.json
```

Relevant owners:

| Component | Responsibility |
| --- | --- |
| `AppConfig.getMemoryDir()` | Returns `<app-data-dir>/memory`. |
| `AgentRunMemoryLayout` | Maps standalone run IDs to `memory/agents/<runId>`. |
| `TeamMemberMemoryLayout` | Maps team/member IDs to `memory/agent_teams/<teamRunId>/<memberRunId>`. |
| `AgentRunProvisioningService` | Creates standalone run IDs and explicit run `memoryDir`. |
| `TeamRunService` / metadata mapper | Creates team member memory dirs. |
| Native `autobyteus-ts` `MemoryManager` | Owns native AutoByteus trace ingestion. |
| `AgentRunMemoryRecorder` | Records Codex/Claude runtime events as storage-only memory sidecar. Skips native AutoByteus to avoid duplication. |
| `RunMemoryFileStore` | Low-level active + archived raw trace corpus reader/writer. |
| `AgentMemoryService` | Memory inspector/read model. |
| `LocalMemoryRunViewProjectionProvider` | Normalizes complete raw trace corpus into replay events for all runtimes. |

Raw trace fields include:

- `trace_type`: user, assistant, reasoning, tool_call, tool_result, compaction boundary, etc.
- `content`: text payload.
- `tool_name`, `tool_call_id`, `tool_args`, `tool_result`, `tool_error`.
- `turn_id`, `seq`, `ts`, `source_event`, `correlation_id`.

### 2. Strategy Source: Agent Package / Skill Files

Server skills are discovered from app data, configured skill roots, and imported agent package roots.

Important roots:

```text
<app-data-dir>/skills/<skillName>/SKILL.md
<app-data-dir>/agents/<agentId>/skills/<skillName>/SKILL.md
<app-data-dir>/agent-teams/<teamId>/skills/<skillName>/SKILL.md
<agent-package-root>/agents/<agentId>/skills/<skillName>/SKILL.md
<agent-package-root>/agent-teams/<teamId>/skills/<skillName>/SKILL.md
```

Relevant owners:

| Component | Responsibility |
| --- | --- |
| `AppConfig.getSkillsDir()` | Returns `<app-data-dir>/skills`. |
| `AppConfig.getAdditionalAgentPackageRoots()` | Lists imported package roots via `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`. |
| `SkillService` | Catalog, create/update/delete/enable/disable, file tree, versioning integration. |
| `SkillDiscovery` | Scans global skill dirs and bundled definition-root skills. |
| `ConfiguredAgentSkillResolver` | Resolves `agent-config.json.skillNames` to exact contextual `Skill.rootPath`s. |
| `SkillVersioningService` | Per-skill git versioning/rollback for versioned writable skills. |
| `AgentDefinitionService` | Loads agent definitions; definition `skillNames` declare which logical skills an agent uses. |
| `AgentTeamDefinitionService` | Loads team definitions and team-local member definitions. |
| Codex/Claude skill materializers | Symlink resolved skills into runtime workspaces. |

Runtime skill binding is not a generic global scan. The important bridge is:

```text
AgentDefinition.skillNames
  -> SkillService.resolveConfiguredSkillsForAgent(definition)
  -> exact Skill.rootPath values used by runtime
```

## Existing Bridge Between Trace and Skill

The existing bridge is indirect but strong:

```text
run metadata
  -> agentDefinitionId / teamDefinitionId / memberRunId
  -> AgentDefinitionService / TeamRun metadata
  -> AgentDefinition.skillNames
  -> SkillService.resolveConfiguredSkillsForAgent(...)
  -> concrete skill root paths and skill contents
```

For standalone runs:

```text
memory/agents/<runId>/run_metadata.json
  contains agentDefinitionId, memoryDir, runtimeKind, skillAccessMode, workspaceRootPath
```

For team member runs:

```text
memory/agent_teams/<teamRunId>/team_run_metadata.json
  contains member tree with memberRunId, memberRouteKey, agentDefinitionId, runtimeKind, skillAccessMode

TeamMemberMemoryLayout.getMemberDirPath(teamRunId, memberRunId)
  locates member raw traces
```

This is enough for a first resolver, but it has one important historical accuracy gap: run metadata records `skillAccessMode`, but it does not appear to snapshot the exact skill root paths, skill versions, or skill content hashes used at run start. Today a future evolution service can reconstruct current skill bindings from current definitions, but that may differ from what the run actually used if skills changed after the run.

## Proposed Connection Architecture

The latest MVP direction is intentionally simple and direct-edit oriented. The service should connect traces to skill file paths and launch the evolver, but it does not need a custom patch/proposal/apply tool chain in the first slice.

```text
SkillEvolutionService
  ├─ ExperienceSelector
  ├─ TraceCorpusReader
  ├─ SkillBindingResolver
  ├─ EvidenceDistiller
  ├─ EvolverAgentRunner / EvolverTeamRunner
  ├─ EvolutionRunRecorder
  └─ OptionalPostRunChangeRecorder
```

### 1. ExperienceSelector

Selects which experience window to learn from:

- one standalone run;
- multiple runs for the same agent definition;
- one team member's runs;
- a time window;
- failed runs;
- user-corrected runs;
- reviewed runs.

MVP: selected run from the manual `Improve from this run` action.

### 2. TraceCorpusReader

Reads complete raw trace corpus, active plus archived segments. Use the same memory/run-history paths already identified for standalone and team member runs. The service can pass either a distilled evidence package or exact trace file references to the evolver task.

### 3. SkillBindingResolver

Maps selected traces to the skills that likely governed those traces.

Standalone path:

```text
run_metadata.agentDefinitionId
  -> AgentDefinitionService.getFreshAgentDefinitionById(...)
  -> SkillService.resolveConfiguredSkillsForAgent(definition)
```

Team member path:

```text
team_run_metadata.memberTree[memberRunId].agentDefinitionId
  -> AgentDefinitionService.getFreshAgentDefinitionById(...)
  -> SkillService.resolveConfiguredSkillsForAgent(definition)
```

Outputs:

- target agent definition;
- logical `skillNames` from definition config;
- resolved concrete `Skill` objects;
- root paths and `SKILL.md` paths;
- source classification when available;
- whether the path appears Git-backed, when easy to detect.

### 4. EvidenceDistiller

Compresses traces into learning-relevant signals before the evolver sees them:

- repeated user corrections;
- failed tool calls and tool errors;
- long inefficient loops;
- cases where a skill was likely not activated;
- cases where a skill was activated but not followed;
- successful patterns worth preserving.

MVP can be lightweight: include a trace digest plus direct references/paths rather than building a complex evidence tool.

### 5. EvolverAgentRunner / EvolverTeamRunner

Runs the reflective agent/team. MVP uses a single visible evolver agent. It receives:

- evidence digest or trace references;
- target agent definition summary;
- exact current relevant skill file paths;
- instruction to update skill files directly if an improvement is warranted;
- instruction to avoid changing unrelated files.

The evolver may use the existing `run_bash`/shell tool to edit the skill files directly. It does not need to emit a structured diff or patch result.

### 6. EvolutionRunRecorder

Records enough provenance for later inspection:

- target run/team/member;
- evolver run ID;
- trigger source;
- target skill paths supplied to the evolver;
- runtime/model used by the evolver;
- completion/failure status.

### 7. OptionalPostRunChangeRecorder

After the evolver finishes, the service can cheaply record the observable result without introducing a custom apply pipeline:

```text
- git status --short on the skill repo/workspace, where available
- git diff --stat, where available
- changed skill file paths, where available
```

Rollback is primarily Git-based for the MVP. If later this feature becomes generally available beyond internal testing, a stricter service-mediated proposal/apply strategy can be added.

## Key Design Gap To Fix

Add a run-start skill snapshot to make evolution historically accurate.

Suggested run metadata addition:

```json
"resolvedSkillBindings": [
  {
    "skillName": "implementation-engineer",
    "rootPath": "/.../agents/implementation-engineer/skills/implementation-engineer",
    "sourceKind": "agent_package_private",
    "contentHash": "sha256:...",
    "activeVersion": "0.1.3",
    "isReadonly": false
  }
]
```

Without this, the evolver can still work, but it may analyze traces from an older skill version while reading today's skill content.

## Recommended MVP Flow

```text
User manually triggers skill evolution for target agent/run
  -> check global feature toggle and target/run eligibility
  -> read selected run metadata and trace corpus
  -> resolve current configured skills and exact SKILL.md paths
  -> prepare concise evidence/task message
  -> launch visible EvolverAgent run in target workspace
  -> autoExecuteTools: true; run_bash/shell available
  -> evolver edits target skill files directly if improvement is warranted
  -> record evolver run ID and optional git status/diff summary
  -> notify/reload affected target agent where possible
  -> future runs use changed skills
```

## Naming Recommendation

Prefer product terms that express human-like reflection without implying unsafe autonomous code mutation:

- Service: `SkillEvolutionService` or `AgentExperienceDistillationService`.
- Agent/team: `ExperienceDistiller`, `SkillEvolutionAgent`, or `ReflectionTeam`.
- Artifact: `EvolutionRequest` / `EvolutionRunRecord`; no `SkillEvolutionProposal` artifact is required for the direct-edit MVP.

Recommended naming set:

```text
ExperienceDistillationService
ReflectionTeam
SkillEvolutionProposal
```

This matches the human-learning analogy: traces are experience; skills are distilled strategy.

## Live Target-Agent Reload After Direct Skill Update

The user proposed that after a skill file is updated, the system should notify the target agent that its skill improved and ask/force it to reload. This is directionally correct, but the current runtime needs an explicit reload mechanism; changing `SKILL.md` on disk is not enough for active runs.

Current native runtime facts:

- `AgentFactory.prepareSkills(...)` registers configured skills into the singleton runtime `SkillRegistry` when the agent runtime is created/restored.
- `SkillRegistry` caches `Skill` objects loaded from disk.
- `AvailableSkillsProcessor` injects the skill catalog/details into the processed system prompt during bootstrap.
- `LLMRequestAssembler.ensureSystemPrompt(...)` only appends the system prompt when the working context is empty; it does not replace an existing system prompt after a skill update.
- `load_skill` first returns the cached registry skill by name. In `PRELOADED_ONLY` mode it cannot load by path, so an updated file is not automatically re-read.

Therefore active-run reload requires a first-class event/API, not only a filesystem update.

Recommended behavior by target state:

1. **Inactive / future runs**: no notification is required. The next run resolves current skills at bootstrap and uses the improved skill.
2. **Idle active native AutoByteus run**: send a `SkillUpdatedNotification` and perform a controlled skill refresh before the next turn.
3. **Busy active native AutoByteus run**: queue the refresh until the current turn becomes idle, unless an explicit interrupt/restart policy is selected.
4. **Codex/Claude external runtime active session**: treat as notification plus session-specific refresh/restart semantics. Symlinked files may point at updated content, but provider session skill loading/system context may not refresh automatically.

Recommended reload spine:

```text
direct skill file edit by EvolverAgent
  -> OptionalPostRunChangeRecorder records changed paths/status
  -> SkillUpdateEvent emitted with target agent/run bindings
  -> ActiveRunSkillReloadService finds active target runs
  -> refresh runtime skill registry entries / config bindings
  -> inject skill-update notice or refreshed skill delta into next turn context
  -> record reload acknowledgement in run memory/audit
```

A system-visible notification should include enough concrete content to affect the LLM if the old skill was already in context:

```text
System notification: Skill '<name>' was updated to version '<version>'.
Summary of improvement: ...
Use the updated strategy from now on. If needed, reload/use skill '<name>'.
```

For strong correctness, implement an internal reload operation in addition to the notification:

- re-register changed skill paths in `SkillRegistry`;
- if `skillNames` changed, update runtime config/bindings or require restart;
- append a high-priority system task notification containing the new skill summary/content delta;
- optionally reset/rebuild the system prompt/working context in a future design.

Open design choice: whether skill updates apply immediately to active runs or only on next run. Recommended MVP: **next-run by default, active-run notification/reload optional and queued at idle**.

## Launch Topology Question: Should Self-Evolver Be Put In The Target Agent Team?

The user proposed a possible product implementation: when launching a target agent/team with `enable self-evolving`, the backend could create an agent team containing both the target agent and the self-evolver so the evolver can send `send_message_to` messages to the target agent. This is attractive because team communication already exists, but it changes the target agent's task semantics.

Current team runtime facts:

- Team members receive team context and communication roster metadata.
- `send_message_to` is only available within managed team communication context.
- Team member instructions include current team member identity and allowed recipient roster when `send_message_to` is exposed.
- For Codex/Claude team members, team instruction and runtime roster are included in bootstrap/turn inputs.
- Native AutoByteus has `TeamManifestInjectorProcessor` and team communication context surfaces that can expose teammates in prompt context.

Therefore, making the target agent and evolver members of the same ordinary team would likely make the target agent aware of the evolver and may encourage collaboration/delegation. That is undesirable if the goal is to keep the target agent focused on its business task.

Recommended boundary:

```text
Target agent/team runtime = business execution plane
Evolution agent/team runtime = reflection/learning plane
Evolution service = control plane that connects them
```

Do not convert a normal target launch into a synthetic team just to get messaging. Instead:

1. `enableSelfEvolution` registers the target run for background learning.
2. The target agent/team runs normally and does not see an evolver teammate.
3. The evolution service asynchronously launches an evolver agent/team in a separate evolution run when a trigger fires.
4. The evolver reads target traces through service-provided evidence, not by being a teammate.
5. The evolver directly edits target skill files using existing shell tooling.
6. The service records the evolver run/post-run status and emits a skill-update event to active target runs by default when changes are detected or assumed.
7. A target-run reload/adoption channel handles notification.

Recommended notification channel is not ordinary team messaging. It should be a system/control-plane event:

```text
SkillUpdatedEvent / SkillReloadRequestedEvent
  -> ActiveRunSkillReloadService
  -> runtime reload operation
  -> optional LLM-visible system notification
```

The evolver may still be implemented as a real AutoByteus agent or team, but it should be a separate internal reflection run, not a visible teammate in the target's business team.

Possible product modes:

- `visible_separate_evolver`: compaction-style evolver run appears in UI, analyzes target traces, and directly edits target skill files through existing shell tooling. Recommended MVP.
- `scheduled_visible_evolver`: not implemented placeholder for future scheduled/evidence-window launch.
- `visible_coach`: evolver is intentionally visible as a teammate/coach. This is a separate explicit mode, not default.

## Visible Evolution Run Using The Compaction-Agent Pattern

The user clarified that MVP self-evolution should not be an invisible background process. It should run as a normal visible agent or agent team, similar to the current memory compaction agent, so the user can inspect the run in the product UI and evaluate its behavior.

Current compaction pattern:

- `ServerCompactionAgentRunner` resolves the configured compactor agent definition.
- It calls `AgentRunService.createAgentRun(...)`, creating a normal run that appears in run history/UI.
- It posts a task message to that run using `run.postUserMessage(...)`.
- It subscribes to run events with `CompactionRunOutputCollector`.
- It records run activity summary.
- It terminates the run after collecting output.

Self-evolution can reuse the same pattern:

```text
SkillEvolutionRunner
  -> resolve configured Skill Evolver agent/team definition
  -> AgentRunService.createAgentRun(...) or TeamRunService.createTeamRun(...)
  -> post evolution task message with trace digest + exact target skill paths
  -> evolver edits target skill files directly using run_bash/shell
  -> record evolver run and optional git status/diff
  -> notify/reload target if skill files changed
```

This is different from placing the evolver in the target's business team. The evolver run is visible as its own run, but the target agent does not treat it as a teammate unless an explicit visible-coach mode is selected.

## Target Notification After Direct Skill Update

After the evolver directly edits a target skill file, the evolution service should notify active target agents when changes are detected or assumed. There are two layers:

1. Control-plane reload event: internal runtime/service operation that refreshes skill bindings/caches where supported.
2. LLM-visible system notification: a normal visible message to the target run telling it that a skill changed and summarizing the improvement.

MVP implementation path can use existing run posting APIs:

```text
activeRun = AgentRunService.getAgentRun(targetRunId)
activeRun.postUserMessage(new AgentInputUserMessage(content, SenderType.SYSTEM, null, metadata))
```

Existing `AgentInputPipeline` recognizes `SenderType.SYSTEM` and surfaces system task notifications to UI. The resulting LLM input is still a message turn, so it should only be sent when the target run is idle or deliberately queued until idle.

Recommended notification content:

```text
System notification: your skill '<skillName>' has been updated to version '<version>'.
Reason: <short evidence-grounded diagnosis>.
New strategy summary: <short operational summary>.
Please reload/use the updated skill for future work.
```

Recommended MVP policy:

- Evolution run is visible and inspectable, compaction-agent style.
- Validated in-scope update applies to skill files/versioning.
- If the target run is inactive, no live message is needed; next run sees the new skill.
- If target run is active and idle, send a `SenderType.SYSTEM` notification and run any supported skill-cache refresh.
- If target run is busy, queue notification/reload until idle.
- Longer-term: add a dedicated `SkillReloadRequestedEvent` / `SkillUpdatedEvent` runtime event so reload can be internal while the LLM-visible message remains optional.

## Trigger UX / Evolution Scheduling Recommendation

This section is superseded by the later simplification: manual trigger should be first-class, not merely debug/admin. The current recommended trigger strategy is:

```text
Trigger strategy: off | manual_only | scheduled (future) | signal_based (future)
Evolver strategy: single visible evolver agent initially; evolver team later
Apply behavior: direct target skill-file edits by evolver via run_bash/shell in MVP
Notification behavior: default system event/reload after direct skill-file change, not a user-facing strategy
```

Keep trigger authority in the service/policy, not inside the evolver. The evolver can inspect traces and decide "no useful change", but it should not independently mutate skills or schedule itself.

## Trigger Strategy Refinement: Manual Implemented, Future Placeholders

The user pushed back on an automatic-only recommendation and clarified that manual trigger should be first-class and implemented first. Scheduled and signal-based triggers should remain visible as future strategy placeholders, but must not be selectable/executable in MVP.

Refined recommendation:

- Implement only `manual_only` trigger strategy in MVP.
- Keep `ScheduledTriggerStrategy` and `SignalTriggerStrategy` in the catalog/design as `not_implemented` placeholders.
- Manual trigger should be available as an explicit action, especially on run/detail/history surfaces.
- Manual click is consent to launch a visible direct-edit evolver run.
- Scheduled/cron and signal trigger logic should reuse the same `EvolutionRequest` path later, but no scheduler/signal detector is implemented in the first slice.

Suggested trigger policy shape:

```text
SelfEvolutionTriggerPolicy:
  strategy: "off" | "manual_only" | "scheduled" | "signal_based"
  implementedStrategies: ["manual_only"]
  notImplementedStrategies: ["scheduled", "signal_based"]
```

Suggested product modes:

| Mode | MVP status | Behavior |
| --- | --- | --- |
| Off | Implemented | No evolution controls/runs. |
| Manual only | Implemented | User clicks a simple action such as "Improve from this run" or "Run self-improvement now". |
| Scheduled | Not implemented placeholder | Reserved for future cron/evidence-window runs. |
| Signal-triggered | Not implemented placeholder | Reserved for future feedback/failure/tool-result signals. |

Recommended UI placements for manual trigger:

- Run detail / memory replay page: "Improve agent from this run".
- Agent detail page: "Run self-improvement" with a simple evidence selector, initially latest run or selected run.
- Evolution run/history page: inspect visible evolver runs and changed files/status where practical.

This keeps early UX simple: manual trigger for user-driven moments, and explicit strategy placeholders for future scheduled/signal behavior without expanding MVP scope.

## Minimal Settings Model

The earlier idea of making approval and notification separate strategies is intentionally rejected for MVP. The useful split is only:

```text
Trigger strategy = when an evolution run is launched
Evolver strategy = which evolver agent/team performs the reflection work and how
```

Suggested MVP settings surface, analogous to compaction settings:

- `Self Evolution`: off/enabled.
- `Trigger strategy`: `manual_only` implemented; `scheduled` and `signal_based` reserved as not-implemented placeholders.
- `Default evolver agent`: seeded shared agent definition, e.g. `AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID`.

Suggested persisted settings names:

```text
AUTOBYTEUS_SELF_EVOLUTION_TRIGGER_STRATEGY=off|manual_only|scheduled|signal_based
AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID=<agentDefinitionId>
# later only:
AUTOBYTEUS_SKILL_EVOLVER_TEAM_DEFINITION_ID=<teamDefinitionId>
```

No separate `approvalRequired` or `notifyActiveTargets` settings are needed in MVP. Manual trigger is consent for a visible direct-edit evolver run; notification/reload is default system behavior after skill files change.

As with compaction, a built-in default evolver agent can be seeded as a normal shared agent definition and selected by default only when the setting is blank. This keeps the evolver visible/editable/configurable as a normal product agent while preserving a stable system default.



## Manual-First Strategy Architecture and Run Configuration

The current product decision is: keep the architecture strategy-shaped, but implement only the manual trigger first.

### Configuration Semantics

`enable self-evolution` should mean the target is eligible for self-improvement. It should not automatically mean cron/signal evolution is running.

Recommended configuration shape:

```text
SelfEvolutionConfig:
  enabled: boolean
  triggerStrategy: "manual_only"          # MVP implementation
  evolverStrategy: "single_agent" # MVP implementation
  evolverAgentDefinitionId?: string
```

Future values can be added without changing the main flow, but they should be marked inactive until implemented:

```text
triggerStrategy: "scheduled" | "signal_based" # not implemented in MVP
evolverStrategy: "agent_team"                  # not implemented in MVP
```

Trigger strategy catalog for MVP:

| Strategy | MVP status | Behavior |
| --- | --- | --- |
| `manual_only` / `ManualTriggerStrategy` | Implemented | User explicitly clicks a self-evolve action. |
| `scheduled` / `ScheduledTriggerStrategy` | Not implemented placeholder | Reserved for cron/evidence-window runs; not selectable/executable in MVP. |
| `signal_based` / `SignalTriggerStrategy` | Not implemented placeholder | Reserved for feedback/failure/tool-result signals; not selectable/executable in MVP. |


Configuration can be available at two levels:

1. Agent/team definition default: the target is generally self-evolution eligible.
2. Run configuration override: the user enables/disables self-evolution for a specific run.

For team runs, avoid injecting the evolver into the business team. Treat the selected member/team as a target scope for the separate evolution service.

### MVP Manual Trigger Strategy

The manual strategy exposes actions rather than scheduling jobs:

```text
eligible target run + manual_only
  -> show "Improve from this run" when run is idle/completed and has trace evidence
  -> user clicks action
  -> SelfEvolutionService creates EvolutionRequest
  -> single-agent EvolverStrategy launches visible evolver run
  -> evolver edits target skill files directly or makes no change
```

Recommended UI placements:

- Agent run detail: `Improve from this run`.
- Agent history: action on a completed/idle run.
- Agent detail: `Run self-improvement` with a simple evidence selector, initially latest run or selected run.
- Team run detail: `Improve this member from this run` for a selected member; full-team skill evolution can come later.

Button visibility should require:

- self-evolution enabled for the target or run;
- target has at least one configured skill;
- at least one resolved skill target is writable or can be safely copied/overlaid;
- enough trace evidence exists;
- no active evolution run already exists for the same target/evidence hash.

### Future Trigger Strategies

Scheduled/cron and signal-based triggers should call the same `SelfEvolutionService.createEvolutionRequest(...)` path as the manual button. They differ only in how the request is created and which evidence window is selected.

Do not implement cron/signal scheduling in the first slice. Keep `ScheduledTriggerStrategy` and `SignalTriggerStrategy` as not-implemented placeholders in the catalog/design so the future extension point is explicit without expanding MVP scope.

## MVP Simplification: Avoid Over-Strategizing Approval/Notification

The user pushed back that the MVP should not expose many separate strategies such as approval strategy and notification strategy. This is correct. Too many knobs would make the product feel immature and burdensome.

Refined MVP configuration should only expose the choices that materially matter at launch:

```text
Self-evolution enabled: yes/no
Trigger strategy: manual_only / scheduled_not_implemented / signal_based_not_implemented
Evolver: default single evolver agent
```

Everything else should be default system behavior, not user-facing strategy configuration.

### Direct-Edit Apply Behavior

A separate approval workflow after every evolution run is likely too frustrating. For the manual trigger path, the user's click should act as consent to launch the visible direct-edit evolver run.

Recommended MVP behavior:

```text
User clicks "Improve this agent from this run"
  -> visible evolver run starts
  -> evolver receives evidence and exact target skill file paths
  -> evolver uses run_bash/shell to edit SKILL.md files directly
  -> backend records evolver run ID and optional git status/diff summary
  -> target notification/reload is emitted if changes are detected or assumed
```

This removes an extra approval click and avoids creating custom patch/proposal tools. MVP guardrails are intentionally product/process based:

- global self-evolution feature toggle is off by default;
- UI hides controls unless feature is enabled;
- manual trigger is explicit consent;
- evolver run is visible/auditable;
- service passes only target skill paths/context;
- targeted skills are expected to be Git-backed during testing;
- rollback is Git revert / user inspection.

Scheduled mode remains not implemented in MVP.

### Notification / Reload Behavior

Notification should also not be a user-facing strategy in MVP. It should be the default behavior after direct skill-file changes.

Recommended behavior:

```text
DirectSkillFileUpdate
  -> record SkillUpdatedNotification for target agent
  -> if target run is active/idle, send SenderType.SYSTEM notification and refresh supported skill state
  -> if target run is active/busy, queue until idle
  -> if no active run exists, no live message is possible; next run uses updated skill, and UI can show the recorded notification/history
```

Since the manual trigger journey usually happens after the target agent is idle, the common path is simple: user clicks improve, evolver runs visibly, skill is updated, target receives a system notification/reload message.

No separate `notify active targets: yes/no` setting is needed for MVP.

## Evolver Run Launch Context: Compaction-Style Defaults

The self-evolver agent should follow the same broad launch pattern as the memory compaction agent.

### Workspace

Use the target run's resolved workspace root for the visible evolver run:

```text
target run workspaceRootPath
  -> SkillEvolutionRunner
  -> AgentRunService.createAgentRun({ workspaceRootPath })
```

If the target has no workspace, fall back to the server temp workspace, matching the compaction runner behavior. The evolver run still gets its own run ID and memory directory; it does not reuse the target run's memory directory. Target traces and skill snapshots are passed as evidence in the evolution task message or service-provided evidence package.

The inherited workspace is for context, artifact preview, UI/debuggability, and direct skill editing in the simplified MVP. The service should pass exact target skill paths and the evolver prompt should instruct the agent to modify only those skill files.

### Runtime / Model Resolution

Avoid requiring a separate model setting for MVP. Use a resolver analogous to `CompactionAgentSettingsResolver`:

```text
SelfEvolutionAgentSettingsResolver
  -> selected evolver agent definition
  -> optional explicit self-evolution runtime/model override, if later added
  -> otherwise evolver agent defaultLaunchConfig, if set
  -> otherwise target run runtimeKind + llmModelIdentifier fallback
```

For the built-in default self-evolver agent, the recommended default is to avoid hard-coding a model. If no custom model/runtime is specified, the evolver should inherit the target run's resolved runtime and model. This keeps manual self-evolution lightweight: enabling the feature does not require separate model configuration.

### Create-Run Shape

The single-agent MVP can mirror compaction's helper-run creation:

```text
AgentRunService.createAgentRun({
  agentDefinitionId: resolved.evolverAgentDefinitionId,
  workspaceRootPath: targetLaunchContext.workspaceRootPath,
  runtimeKind: resolved.runtimeKind,
  llmModelIdentifier: resolved.llmModelIdentifier,
  autoExecuteTools: true,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
})
```

`autoExecuteTools: true` is the right default for the evolver run because the user is not expected to interact with or approve each tool call inside this helper run. For the simplified MVP, the evolver may use existing shell tooling such as `run_bash` to directly edit target skill files. Do not introduce many custom evolver tools unless later testing proves they are needed.

## Evolver Tool Auto-Execution Refinement

The evolver is a helper/reflection run, not an interactive chat where the user will approve tool calls. Therefore the single-agent evolver strategy should create the evolver run with `autoExecuteTools: true`.

Updated MVP rule: auto-execution is acceptable because the entire feature is off by default, hidden unless enabled, and intended for Git-backed testing first. The evolver can use `run_bash` to inspect and edit skill files directly. The service should still launch the run with explicit target paths/context and record post-run state where practical.

## Evolver Tool Boundary: Direct Skill Editor via Existing Shell Tooling

The latest MVP direction intentionally favors simplicity over a custom patch/apply tool architecture. The evolver should use the existing `run_bash`/shell capability and may directly edit target skill files.

Recommended MVP boundary:

```text
Global feature toggle:
  - self-evolution off by default
  - when off, agent/team configuration does not show self-evolution controls

Manual trigger:
  - user explicitly clicks Improve from this run
  - visible EvolverAgent run starts
  - autoExecuteTools: true
  - existing run_bash/shell tool available

SelfEvolutionService provides task context:
  - target run/team/member identity
  - trace/evidence summary or references
  - current skill root paths / SKILL.md paths
  - instruction: update the skill files directly if improvement is warranted

EvolverAgent:
  - is configured with existing `run_bash` tool access
  - reads traces/skills as needed
  - edits skill files directly using run_bash/shell commands
  - uses exact absolute target `SKILL.md` paths supplied by the service
  - does not need to emit a structured diff or patch result

Post-run handling:
  - service records evolver run ID and target identifiers
  - service can record `git status` / `git diff --stat` / changed skill paths where practical
  - rollback is primarily Git revert / user inspection during testing
```

This avoids creating many special tools such as `read_evolution_evidence`, `emit_skill_change`, or `apply_skill_update`. The system can start with one simple operational path and learn from testing.

### Existing `run_bash` Tool Dependency

The direct-edit MVP depends on the existing `run_bash` tool, not new custom evolver tools. Current code confirms `run_bash` is a registered terminal tool and supports optional `cwd`; absolute paths are allowed.

Design requirement for the built-in self-evolver agent:

```text
agent-config.json.toolNames includes run_bash
AgentRunService.createAgentRun(... autoExecuteTools: true ...)
Evolution task message includes exact absolute target SKILL.md paths
```

The target run workspace root is still useful context, but skills can live in app-data or agent package roots outside that workspace. Therefore, the prompt/task context must include absolute skill file paths instead of assuming relative workspace locations.

### Risk Posture

This is more permissive than a service-mediated patch apply design. It is acceptable for the initial product slice only because:

- the global self-evolution feature toggle is off by default;
- the UI hides self-evolution controls unless the feature is enabled;
- the user manually triggers the run;
- the targeted skill packages are generally Git-backed;
- changes are tested before production merge;
- Git can revert poor skill edits.

If later usage expands beyond internal/testing workflows, a stricter service-mediated proposal/apply strategy can be added as a separate `evolverStrategy` or apply mode.
