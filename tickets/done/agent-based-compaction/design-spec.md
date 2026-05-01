# Design Spec

## Current-State Read

Current production compaction is real but model-direct.

Current primary path:

`LLM response usage -> LLMUserMessageReadyEventHandler -> MemoryManager.requestCompaction -> LLMRequestAssembler -> PendingCompactionExecutor -> CompactionWindowPlanner -> Compactor -> LLMCompactionSummarizer -> LLMFactory/BaseLLM -> CompactionResponseParser -> CompactionResultNormalizer -> MemoryStore -> CompactionSnapshotBuilder -> next LLM dispatch`

What is already good and should remain:

- `LLMUserMessageReadyEventHandler` owns post-response usage capture and threshold checks.
- `LLMRequestAssembler` owns pre-dispatch request preparation and is a thin caller of the pending compaction boundary.
- `PendingCompactionExecutor` owns the pending-compaction cycle: settings/logs, block planning, started/completed/failed status, compactor invocation, snapshot rebuild, and pending-flag clearing/failure gating.
- `CompactionWindowPlanner` owns settled-block/frontier selection.
- `Compactor` owns persistence-side compaction commit: summarizer call, normalization, episodic/semantic writes, and raw-trace prune/archive.
- `CompactionResponseParser` and `CompactionResultNormalizer` own the current structured compacted-memory contract.
- `autobyteus-server-ts` already has a mature visible run framework: `AgentRunService -> AgentRunManager -> AgentRunBackend`, with metadata/history/frontend visibility.

What is too limited:

- `LLMCompactionSummarizer` directly resolves a model identifier and creates a `BaseLLM` through `LLMFactory`. This prevents compaction from being governed by an editable agent definition with independent runtime configuration.
- `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER` is a model override, not an agent/runtime selection. It cannot select server runtimes such as Codex app server or Claude agent SDK.
- `AgentFactory` wires the direct summarizer by default, so the model-direct implementation is the authoritative production path.
- Missing compaction executor wiring can be silently suppressed by `Boolean(memoryManager.compactor && ...)` during threshold checks.
- `CompactionConfigCard.vue` already sits in Server Settings -> Basics, but it currently selects a model and offers “Use active run model”. This UI should instead select a compactor agent definition.

Implementation design-impact correction:

- The earlier reviewed hidden/internal child-run design is replaced. Compactor execution should be treated as **just another normal agent run**.
- The design must not invade mature Codex/Claude/backend bootstrap/thread/session internals merely because the run is for compaction.
- If the existing run framework makes compactor runs visible in frontend/history, that is desirable: users can inspect whether compaction quality is good or bad.

Architectural constraint:

- `autobyteus-ts` cannot import `autobyteus-server-ts`. Runtime kinds such as `codex_app_server` and `claude_agent_sdk` are server-owned. Therefore `autobyteus-ts` must define a runner contract, and server must inject a cross-runtime implementation.

## Intended Change

Make compaction an agent task executed through a normal visible agent run.

The parent runtime still decides **when** compaction happens and **what memory** is compacted. The selected compactor agent decides **how to summarize** the selected settled blocks within a fixed output contract. Server seeds a default normal compactor agent definition into the app-data agents home, selects it when no compactor has been selected, creates a normal run for the selected compactor agent, posts one task, collects final output, terminates the run to avoid leaks, and leaves the run visible in history.

Target primary path:

`LLM response usage -> LLMUserMessageReadyEventHandler -> MemoryManager.requestCompaction -> LLMRequestAssembler -> PendingCompactionExecutor -> CompactionWindowPlanner -> Compactor -> AgentCompactionSummarizer -> CompactionAgentRunner -> visible compactor AgentRun -> structured JSON -> CompactionResponseParser -> CompactionResultNormalizer -> MemoryStore -> CompactionSnapshotBuilder -> next LLM dispatch`

Target bootstrap/configuration path:

`Server startup -> DefaultCompactorAgentBootstrapper -> app-data agents/autobyteus-memory-compactor -> AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID if blank -> Server Settings -> Basics -> CompactionConfigCard -> CompactionAgentSettingsResolver -> selected AgentDefinition.defaultLaunchConfig -> ServerCompactionAgentRunner injected into parent AgentConfig`

Target compactor execution path:

`ServerCompactionAgentRunner -> AgentRunService.createAgentRun -> AgentRunManager -> AgentRunBackend(runtimeKind) -> AgentRun.postUserMessage(compaction task) -> normal run events -> CompactionRunOutputCollector -> AgentRunService.terminateAgentRun -> return final text`

Key change summary:

1. Add a `CompactionAgentRunner` interface in `autobyteus-ts`.
2. Replace direct `LLMCompactionSummarizer` production wiring with `AgentCompactionSummarizer`.
3. Split compactor prompt ownership into two layers:
   - stable behavior/category/preservation/drop guidance owned by the selected compactor agent definition, with the seeded default `agent.md` strong enough for manual testing;
   - the exact current parser-required JSON output contract and block/task payload owned by memory compaction and included in every automated task envelope.
4. Replace `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER` with `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` as the production selection setting.
5. Update `CompactionConfigCard.vue` to select an existing agent definition as the compactor agent. The selected agent's existing edit page remains the place to configure instructions/runtime/model.
6. Add server-side `ServerCompactionAgentRunner` that creates a **normal visible run** through `AgentRunService`, collects final output from normal events, and terminates the run after completion/failure/timeout.
7. Remove model-direct fallback and active-run-model fallback as production behavior.
8. Seed a default normal shared compactor agent definition, proposed id `autobyteus-memory-compactor`, and persistently select it only when no compactor setting exists.
9. Remove/reject hidden/internal child-run semantics and backend-specific compaction changes.

## Terminology

- `Compactor agent` / `compaction agent`: the selected agent definition/runtime/model used only to produce structured compaction output.
- `Parent agent`: the user-facing agent run whose memory is being compacted.
- `Visible compactor run`: the normal `AgentRun` created for a single compaction attempt. It has its own run id, memory dir, metadata/history, and frontend visibility.
- `Compaction task`: the one-shot invocation payload sent to the compactor agent. It should be mostly a short task envelope, the current required JSON output contract, and settled block content; long stable behavior guidance belongs in the compactor agent instructions.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove/decommission the direct model compaction path and active-model fallback as production behavior.
- Treat removal as first-class design work: replace the old model identifier seam with a compactor-agent seam.
- Decision rule: the target design is invalid if compaction can silently fall back from missing compactor-agent config to the active primary model.
- Any legacy path listed in the removal/decommission plan is invalid in the final production refactor unless explicitly reclassified by a new approved design. Do not retain compatibility wrappers, feature flags, or dual-path behavior for direct-model compaction.

## Framework Non-Invasion Policy (Mandatory)

- Policy: `Use existing mature run framework; do not add special backend internals for compaction.`
- Required action: compactor execution uses the top-level normal run API (`AgentRunService.createAgentRun` plus normal `AgentRun` operations), not backend-manager internals.
- Forbidden target-state behavior:
  - compaction-specific `internalTask` fields in generic `AgentRunConfig`;
  - compaction-specific hidden-run filters in generic `AgentRunManager`;
  - compaction-specific branches in Codex/Claude bootstrappers, Codex thread config, or Codex thread manager;
  - backend-specific tool stripping or hidden-history behavior for compaction.
- Decision rule: if a compactor agent run can be created as a normal run, the design must prefer that over modifying backend internals.

## Built-In Default Compactor Agent Policy (Mandatory)

- Terminology: this is a **system-provided default agent definition**, not a hidden/internal run. Its executions remain visible normal runs.
- Template/source-of-truth: add a repo-owned default compactor template under the server compaction capability area, preferably file-backed as `autobyteus-server-ts/src/agent-execution/compaction/default-compactor-agent/{agent.md,agent-config.json}` or an equivalent typed template file if build packaging requires code constants.
- Runtime seeded path: on server startup, copy/create the template into the existing app-data agents home at `appConfigProvider.config.getAgentsDir()/autobyteus-memory-compactor/agent.md` and `agent-config.json`.
- Ownership scope: seed it as a normal `shared` agent definition, not `application_owned`, because users must be able to edit instructions and default launch preferences through the existing agent editor.
- Seeding behavior: create the default directory/files when missing; if only one of `agent.md` or `agent-config.json` is missing, create the missing file from the template while leaving existing files untouched. Do not overwrite existing files.
- Editability/update behavior: startup must not overwrite an existing `autobyteus-memory-compactor` agent directory or file. User edits win. If existing user-edited content is invalid/unparseable, surface/log the normal agent-definition error and require user repair instead of silently replacing it. Future template improvements require an explicit migration/version design, not silent overwrite.
- Selection behavior: if `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` is blank at startup and the default compactor was created or already resolves successfully, persistently set the setting to `autobyteus-memory-compactor`. If the setting already points to another agent, do not change it. If existing default files are invalid and the default cannot resolve, do not force-select it.
- Default launch config: the seeded `agent-config.json` must not assume Codex, LM Studio, Qwen, or any specific model. Runtime/model availability is node-specific. The seeded default may have `defaultLaunchConfig: null`; users or E2E setup configure runtime/model through the normal agent editor/API.
- Failure mode: if the default compactor is selected but has no valid runtime/model, compaction fails with an actionable “configure the compactor agent runtime/model” error. Do not fall back to the parent active model.

## Compactor Prompt Ownership Policy (Mandatory)

- Decision: use a two-layer prompt contract.
- The selected compactor agent definition (`agent.md`) owns stable compaction behavior: purpose, category meanings, preservation rules, drop rules, JSON-only discipline, and manual-test guidance.
- The seeded default `autobyteus-memory-compactor/agent.md` must be self-explanatory enough that a user can run it as a normal visible agent, paste arbitrary conversation/history content, and see a useful compaction attempt without knowing the hidden implementation prompt.
- The memory compaction subsystem owns the exact parser-required JSON schema/output contract because `CompactionResponseParser`, `CompactionResultNormalizer`, and memory persistence consume that shape. That compactor-facing contract must be minimal: semantic entries use only `fact`; do not request LLM-generated free-form `tags` or optional `reference` strings.
- Every automated compaction task must include the current exact JSON contract in the per-task user message. This is the authoritative runtime contract for parser compatibility, especially when the selected agent is user-edited, stale, or custom.
- The per-task user message should not duplicate a long behavior manual. It should be mostly:
  1. a short task/context envelope,
  2. the current exact JSON contract,
  3. `[SETTLED_BLOCKS]` content.
- The default `agent.md` may include a human-readable current output shape for manual testing, but that copy is not the parser source of truth. Automated tasks still override with the current exact contract. That human-readable shape should also omit free-form `tags` and optional `reference`.
- Do not move the parser-required schema exclusively into editable `agent.md` in this change. That would make user-edited/custom/stale agent definitions responsible for memory parser compatibility and would blur the memory subsystem's output-contract ownership.

## Minimal Compactor Output Schema Policy (Mandatory)

- Decision: remove free-form `tags` and optional model-generated `reference` from the compactor-facing output contract.
- Rationale: the surrounding output arrays already provide the semantic category (`critical_issues`, `unresolved_work`, `durable_facts`, `user_preferences`, `important_artifacts`). Asking weaker/local models for extra optional labels or source pointers adds structure burden without enough current value.
- Existing internal memory models may keep optional `tags`/`reference` for other memory sources or future indexing. This decision only removes LLM-generated tags/references from the compactor output schema and prompt contract.
- If future retrieval needs facets/source pointers, design that as an explicit controlled indexing feature with clear consumers and vocabulary, not as ungoverned free-form LLM output in this refactor.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Parent run crosses compaction threshold | Next parent LLM dispatch uses compacted snapshot | `PendingCompactionExecutor` for pre-dispatch cycle; `Compactor` for persistence commit | Main behavior being refactored from model-direct to agent-based compaction. |
| DS-002 | Primary End-to-End | Startup seeds/selects default compactor or server setting selects compactor agent id | Native parent runtime has a resolved `CompactionAgentRunner` | default compactor bootstrapper + server settings + server AutoByteus backend factory | This is where system-provided or user-selected compactor agent/runtime/model enter the parent runtime. |
| DS-003 | Primary End-to-End | `AgentCompactionSummarizer` invokes runner | Compactor agent returns structured JSON text | `CompactionAgentRunner` boundary | This replaces `LLMCompactionSummarizer -> LLMFactory`. |
| DS-004 | Primary End-to-End | Server runner starts visible compactor run | Visible compactor run returns final output and is terminated | `ServerCompactionAgentRunner` using `AgentRunService` | Uses mature normal run framework and leaves inspectable history. |
| DS-005 | Return-Event | Compaction starts/completes/fails | Parent run UI/log consumers observe status | `CompactionRuntimeReporter` | Maintains parent observability and adds compactor agent/runtime/model/run identity. |
| DS-006 | Bounded Local | Compaction output text | Parsed `CompactionResult` | `CompactionResponseParser` | Keeps strict output validation after switching from direct LLM to arbitrary agent runtime. |

## Primary Execution Spine(s)

- Parent memory compaction:
  `Completed parent LLM leg -> LLMUserMessageReadyEventHandler -> MemoryManager.requestCompaction -> LLMRequestAssembler -> PendingCompactionExecutor -> CompactionWindowPlanner -> Compactor -> AgentCompactionSummarizer -> CompactionAgentRunner -> CompactionResponseParser -> CompactionResultNormalizer -> MemoryStore -> CompactionSnapshotBuilder -> next parent LLM dispatch`

- Visible compactor run execution:
  `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID -> CompactionAgentSettingsResolver -> selected AgentDefinition.defaultLaunchConfig -> ServerCompactionAgentRunner -> AgentRunService.createAgentRun -> AgentRunManager -> AgentRunBackend(runtimeKind) -> normal run event stream -> CompactionRunOutputCollector -> AgentRunService.terminateAgentRun`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | After a parent LLM response reports usage above threshold, the handler marks compaction pending. Before the next provider dispatch, the assembler calls the pending-compaction owner. The executor plans eligible settled blocks and asks the compactor to commit compaction. The compactor delegates only summarization to an agent-based summarizer, then stores normalized memory, prunes raw traces, and lets the executor rebuild the snapshot. | `LLMUserMessageReadyEventHandler`, `MemoryManager`, `LLMRequestAssembler`, `PendingCompactionExecutor`, `CompactionWindowPlanner`, `Compactor`, `AgentCompactionSummarizer` | `PendingCompactionExecutor` for cycle, `Compactor` for commit | budget resolution, lifecycle reporter, parser/normalizer, snapshot builder |
| DS-002 | During native parent run construction, server reads `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`. It loads the selected compactor agent definition, reads that definition's default launch config, validates runtime/model presence, and injects a server-backed runner into the parent native `AgentConfig`. | `ServerSettingsService`, `CompactionAgentSettingsResolver`, `AgentDefinitionService`, `AutoByteusAgentRunBackendFactory`, `AgentConfig` | Server settings/resolver/backend factory | setting persistence, agent-definition lookup, runtime availability |
| DS-003 | The compactor asks `AgentCompactionSummarizer` for a result. The summarizer builds a compaction task and calls the runner. It does not know whether the runner uses AutoByteus, Codex, Claude, or a fake test runner. It parses returned text through the existing parser. | `AgentCompactionSummarizer`, `CompactionTaskPromptBuilder`, `CompactionAgentRunner`, `CompactionResponseParser` | `AgentCompactionSummarizer` | output contract, timeout/failure wrapping |
| DS-004 | The server runner creates a normal visible run for the selected compactor agent through `AgentRunService`, posts one compaction task, collects final text from normal run events, records/retains normal run history, terminates the run after completion/failure/timeout, and returns the content to `autobyteus-ts`. | `ServerCompactionAgentRunner`, `AgentRunService`, `AgentRunManager`, `AgentRun`, `AgentRunBackend`, `CompactionRunOutputCollector` | `ServerCompactionAgentRunner` with `AgentRunService` as run lifecycle owner | run id/history, output collection, timeout, cleanup |
| DS-005 | Parent compaction lifecycle remains reported through the existing reporter/notifier/stream path. Payloads gain compactor agent id/name/runtime/model/run fields so users can see which visible compactor run produced the compaction. | `CompactionRuntimeReporter`, notifier/stream converters, frontend status handler | `CompactionRuntimeReporter` | UI message mapping, log detail toggle |
| DS-006 | The selected runtime can return extra text, fenced JSON, or raw JSON. The parser remains the validation owner and extracts/validates the current JSON schema. If invalid, compaction fails before pruning raw traces. | `CompactionResponseParser`, `CompactionPreparationError` | `CompactionResponseParser` | error text truncation/logging |

## Ownership Map

- `LLMUserMessageReadyEventHandler` owns parent post-response usage capture and deciding that compaction is required. It must not choose a compaction model or runtime.
- `MemoryManager` owns parent memory state, raw traces, compaction-required flag, and working context snapshot.
- `LLMRequestAssembler` owns request assembly and calls the pending-compaction boundary before appending the current user message.
- `PendingCompactionExecutor` owns pre-dispatch compaction sequencing, status emission, block planning coordination, snapshot rebuild, and failure wrapping.
- `CompactionWindowPlanner` owns raw-trace to settled/frontier block planning.
- `Compactor` owns the persistence transaction around compaction: call summarizer, normalize, write episodic/semantic, prune/archive raw traces.
- `AgentCompactionSummarizer` owns transforming eligible blocks into a compactor-agent task and parsing the returned text into `CompactionResult`.
- `CompactionAgentRunner` is an interface boundary: it owns “execute this compaction task with the configured compactor agent and return final text”. It does not own memory persistence or planning.
- `DefaultCompactorAgentBootstrapper` owns seeding the system-provided normal shared compactor agent into app-data and selecting it only when no compactor setting exists.
- `ServerSettingsService` owns persistence and registry for `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`.
- `CompactionAgentSettingsResolver` owns reading the selected compactor agent id, loading the selected definition, and resolving launch metadata from `defaultLaunchConfig`.
- `ServerCompactionAgentRunner` owns adapting the TS runner contract to a normal visible server run.
- `AgentRunService` owns creating, recording, resolving, and terminating normal visible compactor runs.
- `AgentRunManager` and backend factories own normal runtime-kind execution behind `AgentRunService`. They must not gain compaction-specific hidden/internal behavior.
- `CompactionRunOutputCollector` owns normal event-to-final-text aggregation for compactor runs.
- `CompactionResponseParser` owns schema validation.
- `CompactionRuntimeReporter` owns parent-run observability payloads.
- `CompactionConfigCard.vue` owns only the settings UI for selecting the compactor agent and existing ratio/context/debug values; it must not own runtime execution policy.

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `LLMRequestAssembler` | `PendingCompactionExecutor` | Maintains pre-dispatch assembly call site | planning, summarization, runtime selection |
| `AgentConfig.compactionAgentRunner` / equivalent constructor option | `CompactionAgentRunner` + `AgentFactory` wiring | Native package injection seam | server runtime-kind resolution |
| `CompactionConfigCard.vue` | server settings + agent-definition store | User-facing server-basics edit surface | runtime execution or fallback policy |
| `AgentRunService.createAgentRun` | normal server run lifecycle | Creates visible compactor runs using existing framework | compaction parser/persistence logic |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `LLMCompactionSummarizer` production wiring | Direct model execution is the limited design being replaced | `AgentCompactionSummarizer` + `CompactionAgentRunner` | In This Change | File may be deleted or moved to tests only; do not keep as fallback. |
| `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER` production setting | Encodes model override rather than agent/runtime selection | `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` | In This Change | Remove from settings resolver/server settings/UI docs. |
| Active run model fallback for compaction | Silently preserves old behavior and prevents config errors from surfacing | Missing-config failure through `CompactionPreparationError` | In This Change | No `settings.compactionModelIdentifier ?? activeModel` path. |
| Built-in system prompt or per-task user message as sole compaction behavior owner | User wants editable/testable compactor agent instructions, but parser compatibility needs a memory-owned contract | two-layer prompt split: strengthened compactor `agent.md` + per-task exact JSON contract envelope | In This Change | Stable behavior belongs in the compactor agent; exact schema remains memory-owned. |
| Free-form `tags` and optional model-generated `reference` in compactor output entries | No current essential consumer; category arrays already classify entries | facts-only semantic entries under typed category arrays | In This Change | Keep internal memory tag/reference support only where independently needed; do not request them from compactor agent. |
| `compaction_model_identifier` as sole status identity | Too narrow for agent/runtime selection | `compaction_agent_definition_id`, `compaction_agent_name`, `compaction_runtime_kind`, `compaction_model_identifier`, `compaction_run_id` | In This Change | Keep model field only as resolved identity, not a setting. |
| UI option “Use active run model” | Old fallback concept | Compactor agent selector / no configured agent warning | In This Change | Must not remain after UI update. |
| Hidden/internal compactor run infrastructure attempted during implementation | User rejected framework invasion; normal run path is sufficient | `ServerCompactionAgentRunner -> AgentRunService` | In This Change | Revert/avoid `internalTask` fields, internal-tasks folder, Codex/Claude/thread changes. |

## Return Or Event Spine(s)

Parent compaction status:

`PendingCompactionExecutor -> CompactionRuntimeReporter -> AgentExternalEventNotifier -> AutoByteusStreamEventConverter -> AgentRunEvent -> WebSocket/server stream -> frontend compaction status handler`

Visible compactor run result:

`AgentRunBackend normal events -> AgentRun.subscribeToEvents -> CompactionRunOutputCollector -> ServerCompactionAgentRunner -> AgentCompactionSummarizer -> CompactionResponseParser`

The compactor run event spine is visible through the existing run framework/history. The parent compaction status should include `compaction_run_id` so users can navigate/inspect the compactor run.

## Bounded Local / Internal Spines

- Parent owner: `PendingCompactionExecutor`
  - Spine: `pending flag -> resolve execution metadata -> plan blocks -> emit started -> compact -> rebuild snapshot -> clear flag OR emit failed and preserve flag`
  - Why this matters: this is the parent gate that prevents the next LLM dispatch from bypassing required compaction.

- Parent owner: `AgentCompactionSummarizer`
  - Spine: `eligible blocks -> task payload -> runner.runCompactionTask -> raw output text -> parser -> CompactionResult`
  - Why this matters: it is the exact replacement for direct `LLMFactory` calls.

- Server owner: `ServerCompactionAgentRunner`
  - Spine: `resolved selected compactor config -> create normal run -> post task -> collect output -> terminate -> return text`
  - Why this matters: it gives compaction cross-runtime agent execution while preserving existing frontend/run-history behavior.

- Server owner: `CompactionRunOutputCollector`
  - Spine: `normal run events -> segment/assistant text accumulation -> terminal/final turn/status/error/tool-wait -> final content or failure`
  - Why this matters: runtime backends emit different event shapes.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Runtime settings for ratio/context/debug | DS-001, DS-005 | `LLMUserMessageReadyEventHandler`, `PendingCompactionExecutor`, `CompactionConfigCard.vue` | Threshold ratio, effective context override, detailed logs | These remain compaction policy controls, not agent runtime controls | Mixing them with agent runner could make runner responsible for parent budget policy |
| Server selected compactor setting | DS-002 | `CompactionAgentSettingsResolver` | Persist/load selected agent definition id | User needs one global Server Basics selection | Putting it in `autobyteus-ts` would create server/config dependency |
| Agent definition lookup | DS-002 | `CompactionAgentSettingsResolver` | Load selected compactor agent definition | Separates config resolution from runtime execution | Putting it in memory code would create server dependency |
| Launch config read | DS-002 | `CompactionAgentSettingsResolver` | Use selected compactor agent `defaultLaunchConfig` | Reuses existing launch preference semantics | Duplicating in server settings creates drift with agent editor |
| Visible run metadata/history | DS-004 | `AgentRunService` | Create run id/memory dir, write metadata, record history | User wants inspectable compactor runs | Hiding this in a custom runner bypasses mature framework |
| Output contract text/schema | DS-003, DS-006 | `AgentCompactionSummarizer` / prompt contract file | Tell agent the current exact parser-required JSON shape in each automated task, with facts-only semantic entries | Required even with editable or stale instructions | If owned by agent definition only, users can accidentally break parser contract; if bloated with optional fields, prompt/API clarity degrades |
| Event-to-output collection | DS-004 | `CompactionRunOutputCollector` | Normalize AutoByteus/Codex/Claude output events | Backend event formats differ | If duplicated in runner branches, runtime-specific bugs multiply |
| Tool request handling | DS-004 | `CompactionRunOutputCollector` / runner timeout policy | Fail clearly if compactor waits on tool approval instead of final JSON | First implementation avoids backend tool suppression | Backend-specific suppression would invade mature runtime internals |
| Observability payload mapping | DS-005 | `CompactionRuntimeReporter` | Add agent/runtime/model/run identity | Users need to see configured compactor agent and inspect run | If omitted, visible run is hard to correlate with parent compaction |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Parent compaction sequencing | `autobyteus-ts/src/memory/compaction/PendingCompactionExecutor` | Reuse/Extend | Already authoritative pre-dispatch owner | N/A |
| Persistence commit | `Compactor` | Reuse | Has clean `Summarizer` seam | N/A |
| Output parsing/normalization | parser/normalizer | Reuse | Existing typed memory contract remains desired | N/A |
| Cross-runtime visible run execution | `AgentRunService`, `AgentRunManager`, `AgentRunBackend` | Reuse/Extend | Existing server-owned runtime and history abstraction | N/A |
| Agent instructions/config | `AgentDefinition`, `agent.md`, `DefaultLaunchConfig`, agent edit page | Reuse/Extend | Existing durable/editable agent abstraction; default compactor instructions must be strong enough for manual compaction tests | N/A |
| Global compactor selection | `ServerSettingsService`, `CompactionConfigCard.vue` | Extend | Existing server-basics compaction card is the requested UX | N/A |
| Runtime event output aggregation | No exact owner | Create New | Need normalized final text across normal runtime events | Existing event converters provide events but not final-output collection |
| Hidden/internal task lifecycle | Not needed | Reject/Create None | User does not want framework invasion; normal run path is enough | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` memory compaction | planning, compactor, summarizer interface, task prompt/output contract, parser/normalizer, status payload shape | DS-001, DS-003, DS-006 | `PendingCompactionExecutor`, `Compactor` | Extend | Add runner contract and agent summarizer. |
| `autobyteus-ts` native agent runtime | runner injection seam | DS-003 | `AgentFactory`, `AgentConfig` | Extend | Keep lower-level and server-independent. |
| `autobyteus-server-ts` server settings | selected global compactor agent id | DS-002 | `CompactionAgentSettingsResolver`, `CompactionConfigCard.vue` | Extend | Replace old model setting. |
| `autobyteus-server-ts` agent definitions | selected compactor definition and default launch preferences | DS-002 | `CompactionAgentSettingsResolver` | Reuse/Extend | No per-parent schema in first design. |
| `autobyteus-server-ts` normal run execution | visible compactor run create/post/observe/terminate | DS-004 | `ServerCompactionAgentRunner` | Reuse/Extend | Use existing top-level run APIs. |
| `autobyteus-web` server settings UI | compactor-agent selector plus existing ratio/context/debug fields | DS-002, DS-005 | server settings APIs | Extend | Existing Server Basics location. |
| `autobyteus-web` run history | visible compactor run inspection | DS-004, DS-005 | user/debugging | Reuse | No special hidden UI. |
| Documentation | setup/config instructions | all | users/operators | Extend | Update old model-direct docs and document visible compactor runs. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction/compaction-agent-runner.ts` | memory compaction | public internal boundary | Defines `CompactionAgentRunner`, `CompactionAgentTask`, `CompactionAgentRunnerResult`, `CompactionAgentExecutionMetadata` | Stable injection contract | Yes |
| `autobyteus-ts/src/memory/compaction/agent-compaction-summarizer.ts` | memory compaction | `Summarizer` implementation | Calls runner, parses output, wraps failures | Direct replacement for LLM summarizer | Yes |
| `autobyteus-ts/src/memory/compaction/compaction-task-prompt-builder.ts` | memory compaction | task builder | Builds short task envelope, required JSON contract, and settled-block payload; schema uses facts-only semantic entries | Keeps output schema memory-owned without duplicating long behavior prose | Yes |
| `autobyteus-ts/src/memory/compaction/llm-compaction-summarizer.ts` | memory compaction | removed/decommissioned | Old direct LLM summarizer | Obsolete | N/A |
| `autobyteus-ts/src/memory/compaction/compaction-runtime-settings.ts` | memory compaction | runtime settings resolver | Ratio, context override, debug logs only | Remove model selection | Yes |
| `autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts` | memory compaction | pending cycle owner | Include compactor agent/run metadata in status; do not resolve model fallback | Existing owner remains | Yes |
| `autobyteus-ts/src/agent/context/agent-config.ts` | native runtime config | config boundary | Add optional `compactionAgentRunner` | Injection seam | Yes |
| `autobyteus-ts/src/agent/factory/agent-factory.ts` | native runtime construction | factory | Wire `AgentCompactionSummarizer` when a runner exists | Runtime construction owner | Yes |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | server settings | setting registry | Replace `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER` with `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` | Existing setting owner | Yes |
| `autobyteus-server-ts/src/agent-execution/compaction/default-compactor-agent-bootstrapper.ts` | server compaction setup | startup bootstrapper | Seed `autobyteus-memory-compactor` into app-data agents and set default compactor setting if blank | Keeps default setup in compaction capability area | Yes |
| `autobyteus-server-ts/src/agent-execution/compaction/default-compactor-agent/agent.md` | server compaction setup | default template | Source template for stable compactor behavior, category guidance, preservation/drop rules, JSON-only discipline, and manual-test guidance | File-shaped template matches normal agent definitions | Yes |
| `autobyteus-server-ts/src/agent-execution/compaction/default-compactor-agent/agent-config.json` | server compaction setup | default template config | Source template for default compactor config, with no environment-specific runtime/model | Avoids hardcoding unavailable runtimes/models | Yes |
| `autobyteus-server-ts/src/agent-execution/compaction/compaction-agent-settings-resolver.ts` | server execution/settings bridge | config resolver | Resolve selected compactor agent definition and default launch config | Avoids placing config lookup in runner or TS memory | Yes |
| `autobyteus-server-ts/src/agent-execution/compaction/server-compaction-agent-runner.ts` | server execution | runner adapter | Implements TS `CompactionAgentRunner` by using `AgentRunService` visible runs | Server-owned cross-runtime bridge | Yes |
| `autobyteus-server-ts/src/agent-execution/compaction/compaction-run-output-collector.ts` | server execution | collector | Final text aggregation from normal run events | Prevents duplication | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | server AutoByteus backend construction | injection point | Create/inject `ServerCompactionAgentRunner` into native parent `AgentConfig` | Existing server -> TS construction seam | Yes |
| `autobyteus-web/components/settings/CompactionConfigCard.vue` | web settings | UI facade | Replace direct model field with compactor-agent selector; keep ratio/context/debug fields | Existing requested UI location | Yes |
| `autobyteus-web/stores/agentDefinitionStore.ts` / `graphql/queries/agentDefinitionQueries.ts` | web agent definitions | option source | Supply agent id/name/defaultLaunchConfig for selector/summary | Existing store/query already close | Yes |
| `autobyteus-ts/docs/agent_memory_design*.md` and related docs | docs | user/operator docs | Document compactor-agent setup and visible history inspection | Existing memory docs | N/A |

Files/areas implementation should revert or avoid for this design:

| File / Area | Required Direction |
| --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-config.ts` | Do not add `internalTask` or compaction-specific policy fields. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Do not add hidden/internal run filtering or compaction-specific create options. |
| `autobyteus-server-ts/src/agent-execution/internal-tasks/` | Remove/avoid this folder for compaction. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/**` | Revert/avoid compaction/internal-task/tool-suppression changes. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/**` | Revert/avoid compaction/internal-task/tool-suppression/thread-history changes. |
| Generic backend bootstrap/thread/session managers | Keep unaware of compaction. |

## Ownership Boundaries

- `autobyteus-ts` memory compaction owns compaction **inputs and outputs**, not runtime-specific execution.
- `CompactionAgentRunner` is the authoritative boundary from memory compaction into agent execution.
- `autobyteus-server-ts` owns runtime-kind resolution and execution through normal run services. It must not leak Codex/Claude classes into `autobyteus-ts`.
- The selected compactor agent definition owns stable behavior instructions and default launch preferences. The default compactor `agent.md` must be useful as a manually testable normal agent.
- The memory subsystem owns the exact JSON output contract and block payload for automated compaction. The per-task prompt carries that current contract as a compatibility envelope, not as the primary behavior manual. The contract should ask for facts only inside category arrays.
- The server setting owns only **which** compactor agent is active globally, not how that agent runs internally.
- The compactor run is a normal visible run. The parent compaction status links to it by run id.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `CompactionAgentRunner` | server/runtime-specific agent execution | `AgentCompactionSummarizer`, tests | Summarizer directly imports `LLMFactory`, `AgentRunService`, `AgentRunManager`, Codex, or Claude | Add fields to `CompactionAgentTask`/result metadata |
| `ServerCompactionAgentRunner` | visible run create/post/collect/terminate | AutoByteus backend factory-injected runner | `autobyteus-ts` imports server runtime kinds | Extend runner contract or server adapter |
| `CompactionAgentSettingsResolver` | server setting, agent-definition lookup, default launch config read | server backend factory / runner factory | Runner parses arbitrary settings/env itself | Add explicit resolver output type |
| `AgentRunService` | run id/memory dir/metadata/history/termination | `ServerCompactionAgentRunner` | Runner calls backend factories directly or bypasses metadata/history | Add a narrow method to service only if normal public behavior is insufficient |
| `Compactor` | summarization + memory commit transaction | `PendingCompactionExecutor` | Pending executor calls summarizer and store independently | Add compactor API if needed |

## Dependency Rules

Allowed:

- `Compactor -> Summarizer`.
- `AgentCompactionSummarizer -> CompactionAgentRunner`, prompt builder, response parser.
- `autobyteus-server-ts -> autobyteus-ts` types/interfaces.
- Server backend factory/settings resolver -> server settings, agent definition services, and normal run service.
- `ServerCompactionAgentRunner -> AgentRunService` and normal `AgentRun` event APIs.
- Web -> server settings APIs and agent-definition GraphQL/store.

Forbidden:

- `autobyteus-ts -> autobyteus-server-ts` imports.
- `AgentCompactionSummarizer -> LLMFactory` in production.
- `PendingCompactionExecutor -> LLMFactory`, Codex, Claude, AgentRunService, or AgentRunManager.
- Silent fallback from missing compactor agent to active parent model.
- Visible compactor run writing into parent `MemoryManager` or parent working-context snapshot directly.
- Compaction-specific hidden/internal fields in generic run config/manager.
- Compaction-specific behavior in Codex/Claude bootstrappers or Codex thread manager.
- Duplicating compactor runtime/model controls in `CompactionConfigCard.vue`; use the selected agent's existing launch preferences.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `CompactionAgentRunner.runCompactionTask(task)` | compaction agent task | Execute configured compactor agent and return final text | `taskId`, parent run metadata, task text/output contract | TS memory package boundary. |
| `AgentCompactionSummarizer.summarize(blocks)` | compaction summarization | Convert blocks to agent task and parse result | `InteractionBlock[]` | Maintains `Summarizer` contract for `Compactor`. |
| `CompactionAgentSettingsResolver.resolve()` | selected compactor config | Resolve server-selected compactor agent and launch config | `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` | Server-only. |
| `AgentRunService.createAgentRun(input)` | visible compactor run | Create normal run, metadata, history | selected agent id, workspace, runtime/model/config | Existing service; do not bypass. |
| `AgentRun.postUserMessage(message)` | compactor task dispatch | Send one compaction task | normal user message payload | Existing run API. |
| `CompactionRunOutputCollector.observe(event)` | output collection | Accumulate final text and terminal/tool-wait/error state | normal `AgentRunEvent` | Server-only. |
| `CompactionRuntimeReporter.emitStatus(payload)` | parent compaction status | Emit lifecycle status with identity | `CompactionStatusPayload` | Add fields, keep existing phases. |
| `CompactionConfigCard.save()` | compaction settings UI | Persist selected compactor agent id and ratio/context/debug settings | server setting keys | No runtime/model model selector. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `CompactionAgentRunner.runCompactionTask` | Yes | Yes | Low | Keep task identity separate from parent run id and compactor run id. |
| `CompactionAgentSettingsResolver.resolve` | Yes | Yes | Low | Require explicit server setting key and selected agent id. |
| `ServerCompactionAgentRunner.runCompactionTask` | Yes | Yes | Medium | Return `compactionRunId` in metadata for parent status. |
| `CompactionRunOutputCollector.observe` | Yes | Yes | Medium | Treat tool-wait/no-final-output as explicit compaction failure. |
| `CompactionConfigCard` setting save | Yes | Yes | Low | Only save agent id; do not save duplicate runtime/model fields. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| agent execution boundary | `CompactionAgentRunner` | Yes | Low | Use “runner” because it returns one task result, not full public lifecycle. |
| summarizer implementation | `AgentCompactionSummarizer` | Yes | Low | Clear replacement for `LLMCompactionSummarizer`. |
| selected settings resolver | `CompactionAgentSettingsResolver` | Yes | Low | Makes server-setting source explicit. |
| visible run adapter | `ServerCompactionAgentRunner` | Yes | Low | Server-owned adapter to normal run APIs. |
| final output aggregator | `CompactionRunOutputCollector` | Yes | Low | Avoid “internal task” naming. |
| server setting | `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` | Yes | Low | Avoid “model” naming and store only selected agent id. |

## Applied Patterns

- **Dependency inversion / callback injection**: `autobyteus-ts` defines `CompactionAgentRunner`; `autobyteus-server-ts` implements it and passes the object down while constructing native AutoByteus parent agents. This avoids reverse dependency.
- **Adapter**: `ServerCompactionAgentRunner` adapts normal server run execution to the `autobyteus-ts` `CompactionAgentRunner` interface.
- **Strategy**: Different runner implementations can satisfy the same runner contract (fake test runner, server visible-run runner) while `AgentCompactionSummarizer` remains stable.
- **Reuse existing lifecycle owner**: `AgentRunService` remains the owner for visible run creation/history/termination rather than creating a parallel internal-task system.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction/compaction-agent-runner.ts` | File | `CompactionAgentRunner` | Runner contract and task/result metadata | Memory compaction owns the abstraction it calls | Server runtime-kind enums/classes |
| `autobyteus-ts/src/memory/compaction/agent-compaction-summarizer.ts` | File | `Summarizer` implementation | Agent runner-backed summarization | Same folder as old summarizer/compactor | Direct LLMFactory calls |
| `autobyteus-ts/src/memory/compaction/compaction-task-prompt-builder.ts` | File | task/output contract builder | Build task prompt and JSON contract | Existing prompt-builder concern split | Agent definition lookup |
| `autobyteus-ts/src/memory/compaction/llm-compaction-summarizer.ts` | File | removed | Remove production direct model summarizer | Old implementation location | Any fallback behavior |
| `autobyteus-ts/src/agent/context/agent-config.ts` | File | native config | Add optional compaction runner/config option | Existing config owner | Server runtime selection |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | File | settings registry | Register `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` and remove model override | Existing settings owner | Runtime execution logic |
| `autobyteus-server-ts/src/agent-execution/compaction/` | Folder | compactor-agent execution adapter/setup | Settings resolver, default bootstrapper/template, server runner, output collector | Clear server-side capability area for compactor execution | Memory planner/parser code; internal-task framework |
| `autobyteus-web/components/settings/CompactionConfigCard.vue` | File | settings UI | Replace direct model override with compactor-agent selector | Existing settings card | Runtime execution policy |
| `autobyteus-ts/docs/agent_memory_design*.md` | File(s) | docs | Document agent-based compaction and visible run history | Existing memory docs | Stale active-model fallback docs |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Core boundary | `Compactor -> AgentCompactionSummarizer -> CompactionAgentRunner` | `Compactor -> LLMFactory.createLLM(...)` | Keeps memory code independent of provider/runtime details. |
| Server runtime use | `ServerCompactionAgentRunner -> AgentRunService.createAgentRun -> AgentRun.postUserMessage` | `autobyteus-ts -> CodexThreadManager` or custom internal task manager | Prevents reverse dependency and framework invasion. |
| Settings shape | `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID=memory-compactor` | `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER=gpt-5.4-codex` | Agent id gives editable instructions plus runtime/model through the selected agent. |
| Compactor visibility | visible run id `memory-compactor-2026...` recorded in history and linked from parent compaction status | hidden child run filtered from history | User can inspect compaction quality. |
| Compactor agent launch config | selected `memory-compactor` agent has `defaultLaunchConfig: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.4-codex', llmConfig: {...} }` | Put runtime/model fields directly in `CompactionConfigCard.vue` | Avoids duplicate config and uses existing agent editor. |
| Prompt ownership | Default `agent.md` explains compaction categories and preservation/drop rules; automated task appends the current exact JSON contract plus settled blocks | Put all behavior/schema only in the per-task message, or only in editable `agent.md` | Users can manually test/tune the agent while parser/store compatibility remains stable. |
| Semantic entry shape | `{ "fact": "..." }` inside `critical_issues` etc. | `{ "fact": "...", "reference": "optional", "tags": ["decision"] }` | Category arrays already classify the fact; optional source pointers/labels make the schema harder for weaker models. |
| Missing config | Threshold crossed -> emit failed status `No compactor agent configured` -> keep compaction pending | Fall back to active parent model | Makes configuration errors visible and avoids old behavior. |
| Tool behavior | normal run launched conservatively; if tool approval is requested, compaction fails clearly and visible run shows why | backend-specific stripping of tools in Codex/Claude bootstrap | Avoids invading backend internals. |

Suggested server setting:

```env
AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID=memory-compactor
```

Suggested selected compactor agent launch config:

```json
{
  "defaultLaunchConfig": {
    "runtimeKind": "codex_app_server",
    "llmModelIdentifier": "gpt-5.4-codex",
    "llmConfig": {
      "reasoning_effort": "medium"
    }
  }
}
```

Suggested `memory-compactor/agent.md` intent:

```md
---
name: Memory Compactor
description: Produces durable compacted memory from settled AutoByteus history.
role: memory compaction specialist
---

You are the AutoByteus Memory Compactor. Turn settled conversation, tool,
validation, file, and planning history into compact memory for future runs.

When manually tested, accept pasted conversation/history content and produce
the same categories used by automated compaction: episodic summary, critical
issues, unresolved work, durable facts, user preferences, and important
artifacts.

Preserve decisions, constraints, user preferences, open work, critical failures,
validation results, tool outcomes, file paths, created/modified artifacts, and
other facts future work may need. Drop repeated chatter, transient progress
messages, verbose raw payloads, and low-value operational noise.

Return JSON only. Do not invent facts. Obey the exact JSON output contract
supplied in automated compaction tasks when present.
```

Suggested automated task envelope shape:

```text
Compact the settled blocks below into durable AutoByteus memory.
Use the current output contract exactly.

[OUTPUT_CONTRACT]
{ current exact JSON schema from memory compaction, facts-only semantic entries }

[SETTLED_BLOCKS]
...rendered settled blocks...
```

Injection shape to avoid reverse dependency:

```ts
// autobyteus-ts owns this interface only.
export interface CompactionAgentRunner {
  runCompactionTask(task: CompactionAgentTask): Promise<CompactionAgentRunnerResult>;
}

// autobyteus-server-ts implements it and injects it while creating the parent native agent.
const runner = new ServerCompactionAgentRunner({ agentRunService, resolvedCompactorConfig });
const agentConfig = new AgentConfig({
  // existing native parent agent fields...
  compactionAgentRunner: runner,
});
```

Visible normal-run execution shape:

```ts
const { runId } = await agentRunService.createAgentRun({
  agentDefinitionId: resolvedCompactor.agentDefinitionId,
  workspaceRootPath: task.parentWorkspaceRootPath,
  llmModelIdentifier: resolvedCompactor.llmModelIdentifier,
  runtimeKind: resolvedCompactor.runtimeKind,
  llmConfig: resolvedCompactor.llmConfig,
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
});

const run = await agentRunService.resolveAgentRun(runId);
const unsubscribe = run.subscribeToEvents((event) => collector.observe(event));
try {
  await run.postUserMessage({ content: task.prompt });
  const output = await collector.waitForFinalOutputOrFailure();
  return { outputText: output, metadata: { compactionRunId: runId } };
} finally {
  unsubscribe();
  await agentRunService.terminateAgentRun(runId);
}
```

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER` and use it when no compactor agent exists | Easier migration from existing settings | Rejected | Remove production use; require `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` or explicit missing-config failure. |
| Fall back to active parent model when runner/config is missing | Preserves current behavior | Rejected | Emit failed compaction status and keep pending gate. |
| Keep `LLMCompactionSummarizer` as a fallback implementation | Reduces implementation work | Rejected | Replace with agent runner-backed summarizer; fakes can be used in tests. |
| Let compactor agent define arbitrary output | Maximizes flexibility | Rejected | Agent instructions are flexible, output schema remains fixed. |
| Move the exact parser-required schema exclusively into editable `agent.md` | Makes manual messages nearly content-only | Rejected for this change | Strengthen default `agent.md` for manual testing, but keep the current exact schema in each automated task envelope. |
| Keep free-form `tags` in compactor output entries | SemanticItem supports optional tags and existing tests used sample tags | Rejected for this change | Remove tags from compactor-facing schema; use category arrays. |
| Keep optional model-generated `reference` in compactor output entries | Can provide traceability to source turns/files | Rejected for this change | Remove from compactor-facing schema; if source pointers are needed later, design deterministic/controlled references. |
| Put runtime/model selectors in Server Basics compaction card | Convenient one-screen config | Rejected for first design | Server Basics selects the agent; selected agent editor owns runtime/model/config. |

## Framework-Invasion Rejection Log (Mandatory)

| Candidate Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Hidden/internal compactor runs | Avoid run-history noise | Rejected after user feedback | Use normal visible compactor runs; history visibility is useful. |
| `internalTask` field in generic `AgentRunConfig` | Could signal hidden/tool-suppressed behavior | Rejected | No generic config change; normal run config remains generic. |
| Hidden filtering in `AgentRunManager.listActiveRuns` | Hide compactor runs from UI | Rejected | Let visible run framework show runs. |
| Codex/Claude bootstrap changes for tool suppression | Enforce safe compaction tools | Rejected | Do not modify backend internals; use conservative normal launch inputs and fail on tool-wait if needed. |
| Codex thread manager ephemeral/history changes | Hide compactor thread/history | Rejected | Normal history is desired for inspection. |
| New `agent-execution/internal-tasks` lifecycle | Encapsulate hidden task execution | Rejected | `ServerCompactionAgentRunner` uses `AgentRunService` normal lifecycle. |

## Derived Layering

- Memory/domain layer (`autobyteus-ts`): compaction planning, task contract, summarizer interface, parser/normalizer, persistence commit.
- Native runtime layer (`autobyteus-ts`): agent factory/config and runner injection seam.
- Server settings/definition layer (`autobyteus-server-ts`): global selected compactor agent id, selected `AgentDefinition`, and its `defaultLaunchConfig`.
- Server runtime layer (`autobyteus-server-ts`): normal visible run execution through `AgentRunService`/`AgentRunManager`.
- UI layer (`autobyteus-web`): Server Basics compactor-agent selector, existing agent edit launch preferences, and existing run history inspection.

The important rule is dependency direction: server may implement the `autobyteus-ts` runner contract; `autobyteus-ts` must not know server runtime kinds.

## Migration / Refactor Sequence

1. Revert/avoid implementation changes that add hidden/internal compaction semantics:
   - `internalTask` fields in `AgentRunConfig`;
   - internal/hidden options or filtering in `AgentRunManager`;
   - `agent-execution/internal-tasks/` folder;
   - Codex/Claude bootstrap/thread/session/tool-suppression changes.
2. Keep or add the core `autobyteus-ts` `CompactionAgentRunner` contract and task/result metadata types.
3. Split prompt construction:
   - strengthen the default compactor `agent.md` so stable behavior/category guidance and manual-test instructions live with the agent;
   - keep block rendering and exact output schema in memory compaction;
   - remove free-form `tags` and optional model-generated `reference` from the compactor-facing output schema;
   - make automated user messages mostly a short task envelope, current JSON contract, and settled blocks;
   - stop using a hard-coded per-task behavior manual as the only behavior source.
4. Add `AgentCompactionSummarizer` implementing `Summarizer` through the runner and existing parser.
5. Update `CompactionRuntimeReporter`/status payload types to include compactor agent/runtime/model/run metadata.
6. Update `PendingCompactionExecutor` to report runner metadata and stop resolving model fallback.
7. Update missing compactor/runner behavior: if threshold crosses and compaction cannot be executed, emit a failed compaction status and return a `CompactionPreparationError` path instead of continuing silently.
8. Update native `AgentFactory`/`AgentConfig` wiring:
   - remove `LLMCompactionSummarizer` production wiring;
   - wire `AgentCompactionSummarizer` only when a runner is configured.
9. In server settings, add `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` and remove/deprecate `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER` from predefined production settings.
10. Add `DefaultCompactorAgentBootstrapper` and a strengthened default compactor template. Run it during server startup before agent-definition cache preloading/normal run use. It must seed `autobyteus-memory-compactor` if missing, preserve existing edits, set the compactor setting only if blank, and refresh agent-definition cache after seeding.
11. Add `CompactionAgentSettingsResolver` to read the selected agent id, load the selected agent definition, and resolve launch config from the selected agent's `defaultLaunchConfig`.
12. Add `CompactionRunOutputCollector` under `agent-execution/compaction` for normal run event aggregation.
13. Add/update `ServerCompactionAgentRunner` implementing the `autobyteus-ts` runner contract by:
    - creating a normal visible run with `AgentRunService.createAgentRun`;
    - posting one compaction task;
    - collecting final output from normal run events;
    - terminating the run in `finally` after success/failure/timeout;
    - returning output text plus `compactionRunId` metadata.
14. Inject `ServerCompactionAgentRunner` from `AutoByteusAgentRunBackendFactory` when creating native parent runs.
15. Update `CompactionConfigCard.vue`:
    - remove LLM provider/model fetching and “Use active run model” option;
    - fetch agent definitions with `useAgentDefinitionStore()`;
    - save selected id to `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`;
    - optionally display selected agent runtime/model summary from `defaultLaunchConfig`;
    - keep trigger ratio, active context override, and debug logs.
16. Remove/decommission `LLMCompactionSummarizer`, `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER`, web direct model selector, docs references, and tests that assert active-model fallback.
17. Add/update validation:
    - fake runner unit tests;
    - server settings resolver tests;
    - normal visible compactor-run tests with fake `AgentRunService`;
    - integration test showing primary runtime/model A and compactor runtime/model B;
    - visible history/metadata correlation test;
    - default compactor bootstrap/selection/edit-preservation tests;
    - default compactor prompt/manual-test guidance test and task-envelope contract test;
    - compactor schema simplification test proving prompts/docs require only facts in semantic entries;
    - AutoByteus parent + Codex compactor API/E2E scenario owned by API/E2E validation;
    - missing config failure test;
    - `CompactionConfigCard` selector/save test;
    - existing planner/parser/normalizer/snapshot tests.
18. Update docs with compactor agent definition, Server Settings binding examples, and visible compactor-run inspection guidance.

Temporary seams:

- During implementation, a fake runner can be used in tests before server runner is complete.
- Do not ship a dual runtime path where both model-direct and agent-runner production summarizers are selectable.
- Do not ship hidden/internal compactor run framework changes unless a later approved design reintroduces them.

## Key Tradeoffs

- **Agent flexibility vs deterministic output:** The design allows configurable instructions/runtime/model but keeps the output schema fixed. This gives flexibility without destabilizing memory persistence.
- **Manual testability vs parser ownership:** Strengthening `agent.md` makes the default compactor understandable and testable as a normal agent, while repeating the exact current schema in automated task envelopes protects parser compatibility when agent instructions are edited, stale, or custom.
- **Optional metadata vs schema simplicity:** Free-form tags and model-generated references could someday help retrieval/traceability, but they are not core to this refactor. Removing them from the compactor contract makes the prompt easier for weaker models and keeps the output focused on durable facts.
- **Visible normal runs vs hidden internal runs:** Visible normal runs reuse the mature framework and let users inspect quality. They may add history entries, but the user explicitly accepts/prefers this.
- **Server runner vs TS-only runner:** Cross-runtime selection must live in server to avoid circular dependencies. `autobyteus-ts` owns only the abstraction.
- **Global compactor setting vs per-agent override:** Global Server Basics selection is simpler and matches user feedback. Per-primary-agent overrides can be added later if needed.
- **No fallback vs ease of migration:** Rejecting active-model fallback is stricter but avoids hiding misconfiguration and preserves the architectural goal.
- **No backend tool suppression vs safety:** Avoiding backend-specific suppression respects the mature framework. The first implementation uses conservative normal launch defaults and visible failure if the compactor asks for unavailable tool approval.

## Risks

- Visible history may accumulate many compactor runs. Mitigation: compactor run names/status/linking make them inspectable; future filtering can be designed separately if needed.
- Active compactor run leaks if cleanup fails. Mitigation: `try/finally` termination and tests for failure/timeout paths.
- External runtime final-output collection may miss content for a backend-specific event shape. Mitigation: shared output collector with backend-specific fixture tests.
- Codex/Claude may produce non-JSON output despite instructions. Mitigation: existing parser extraction plus explicit failure; no raw-trace prune on failure.
- The seeded default compactor may be selected before a runtime/model is configured. Mitigation: fail with an actionable error and make the Server Settings card/agent editor path clear; do not choose environment-specific model defaults.
- Runtime costs/latency can increase if compaction uses heavyweight agents. Mitigation: compaction status identity/logging and launch config selection.
- Existing users with only `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER` will need configuration changes. Mitigation: docs and optional bootstrap-created default compactor agent, but no silent fallback.
- Global compactor selection may be too coarse for some users. Mitigation: later per-agent override design can layer on top without changing the runner contract.

## Guidance For Implementation

- First revert/avoid the partial hidden/internal backend changes. Specifically, remove compaction/internal-task changes from generic run config/manager and Codex/Claude/CodexThread internals.
- Start with the core `autobyteus-ts` contract and fake-runner tests before touching server runtime code.
- Preserve existing compaction planner/store/parser/normalizer tests; the refactor should not change memory semantics.
- Make missing compaction config fail at the compaction gate with a message like: `Memory compaction failed before dispatch: no compactor agent is configured. Set AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID in Server Settings -> Basics -> Compaction.`
- Use normal visible compactor runs:
  - create through `AgentRunService.createAgentRun`;
  - use the selected compactor agent's own definition and default launch config;
  - use a separate run id/memory dir;
  - post exactly one compaction task;
  - collect final output through normal events;
  - terminate in `finally` after success/failure/timeout;
  - keep the run visible in history.
- Add resolved identity to parent compaction status/logs:
  - `compaction_agent_definition_id`
  - `compaction_agent_name`
  - `compaction_runtime_kind`
  - `compaction_model_identifier`
  - `compaction_run_id`
  - `compaction_task_id`
- Avoid naming anything “helper” for core policy. Use explicit owner names: settings resolver, runner, output collector, summarizer.
- Keep `CompactionTaskPromptBuilder` as the memory-owned task envelope/schema builder, but remove duplicated long behavioral prose from automated user messages once the default `agent.md` carries that stable behavior.
- Remove `tags` and `reference` from the compactor-facing schema in `CompactionTaskPromptBuilder`, default `agent.md`, docs, and tests. If compaction result/internal types still carry optional tags/reference for other memory paths, default compactor output should leave them empty/not present.
