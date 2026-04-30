# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined after minimal compactor schema clarification (pending architecture re-review)

## Goal / Problem Statement

Refactor compaction from a direct internal model call into an agent-owned compaction task. Today `autobyteus-ts` compaction is wired as `PendingCompactionExecutor -> Compactor -> LLMCompactionSummarizer -> LLMFactory.createLLM(...)`; the summarizer uses a built-in prompt and resolves the compaction model from `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER`, otherwise the active run model. This makes compaction hard to customize: compaction behavior cannot be represented as an editable agent, cannot reuse normal agent instructions, and cannot select server-managed runtimes such as Codex or Claude agent SDK through the same runtime/model configuration path used by ordinary agents.

The target is an agent-based compaction architecture with a simple user-facing binding: the platform seeds a normal visible/editable default **Memory Compactor** agent definition into the existing app-data agents home, auto-selects it in **Server Settings -> Basics -> Compaction** when no compactor has been selected, and users can then edit that normal agent's instructions/default runtime/model in the existing agent editor. When compaction is needed, server creates a **normal visible compactor agent run** through the existing top-level run service/manager, sends one compaction task, collects the final output, terminates the run to avoid leaks, and leaves the run visible in history for inspection.

The parent runtime still owns when compaction is required, which raw traces are compacted, persistence, and snapshot rebuild; the compactor agent owns the stable summarization behavior for producing compacted memory. The memory subsystem remains the authoritative owner of the exact parser-required JSON output contract and includes that current contract in each automated compaction task so user-edited or stale compactor instructions cannot silently break memory persistence. The default compactor `agent.md` must still be self-explanatory enough for manual testing with arbitrary conversation/history content. The compactor output contract should stay minimal and should ask the model only for the facts inside typed category arrays; free-form `tags` and optional model-generated `reference` strings are removed from this ticket's compactor-facing schema.

## Investigation Findings

- The current production compaction spine is native and model-direct: `LLMUserMessageReadyEventHandler` requests compaction based on token budget, `LLMRequestAssembler` calls `PendingCompactionExecutor`, `Compactor` calls `LLMCompactionSummarizer`, and `LLMCompactionSummarizer` creates a `BaseLLM` through `LLMFactory`.
- Current compaction already has strong memory-owned behavior that should remain: block/frontier planning, trace-ID pruning, typed semantic categories, deterministic normalization, snapshot reset, failure safety, and compaction lifecycle status events.
- Current compaction model choice is a global/environment model override, not an agent/runtime selection: `CompactionRuntimeSettingsResolver` exposes `compactionModelIdentifier`, and `LLMCompactionSummarizer` uses that identifier or falls back to the active model.
- `autobyteus-ts` owns the memory/compaction subsystem and native `AgentFactory`/`AgentRuntime`; it must not import `autobyteus-server-ts` or server runtime kinds.
- `autobyteus-server-ts` already owns normal cross-runtime run creation through `AgentRunService -> AgentRunManager -> AgentRunBackend`. That existing public run path can create AutoByteus/Codex/Claude runs and records run metadata/history.
- Agent definitions already provide the right durable authoring surface for compaction behavior: `agent.md` instructions plus `defaultLaunchConfig` for `runtimeKind`, `llmModelIdentifier`, and `llmConfig`.
- The existing frontend already places `CompactionConfigCard` in the Server Settings basic area, and the agent edit form already exposes launch preferences through `DefinitionLaunchPreferencesSection`. Therefore the best UX is to replace the compaction model selector in the compaction card with a compactor-agent selector, while runtime/model/instructions remain configured on the selected agent.
- Implementation feedback showed that forcing hidden/internal child-run semantics would invade mature backend bootstrap/thread/session code. User prefers or accepts visible normal compactor runs so compaction quality can be inspected in run history.
- Agent definitions already support the existing app-data agents home (`getAgentsDir()`), read/write `agent.md` plus `agent-config.json`, and normal visibility/editability. This is the right place to seed a default platform-provided compactor agent definition without adding a new definition system.
- Implementation feedback showed the default compactor prompt needs stronger ownership in `agent.md`: users should be able to open the compactor as a normal agent, send arbitrary settled conversation/history content, and see how it compacts without reverse-engineering a hidden per-task prompt.
- Follow-up schema inspection showed compactor-generated `tags` are free-form labels that are parsed/stored but not used by the current snapshot rendering path. Since each semantic array already carries the category, `tags` add prompt/API complexity without a present consumer.
- Follow-up user clarification challenged optional `reference` as another potentially difficult field for weaker LLMs. `reference` currently means a source pointer such as a turn id, file path, artifact id, or tool result note, but because it is model-generated and optional, it is not essential to the first compactor contract.

## Recommendations

- Keep the current memory compaction owner boundaries (`PendingCompactionExecutor`, `CompactionWindowPlanner`, `Compactor`, parser/normalizer, snapshot builder) and replace only the summarization execution boundary.
- Introduce a `CompactionAgentRunner` contract in `autobyteus-ts` so memory compaction can call “the configured compactor agent task” without importing server runtime implementations.
- Replace `LLMCompactionSummarizer` with `AgentCompactionSummarizer`, which builds the compaction task, calls the runner, parses the runner output through the existing `CompactionResponseParser`, and returns `CompactionResult`.
- Move cross-runtime compactor-agent execution into `autobyteus-server-ts` as a visible normal-run adapter backed by `AgentRunService` / `AgentRunManager`, because server is the existing owner of run creation, runtime kind resolution, metadata, and history.
- Bind the active compactor agent through a server setting, proposed key `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`, surfaced in `CompactionConfigCard.vue` as “Compactor agent”.
- Add a default compactor-agent bootstrapper that writes a normal shared agent definition, proposed id `autobyteus-memory-compactor`, into the app-data agents directory if missing, and sets `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` to that id only when the setting is blank.
- Reuse the selected compactor agent definition's existing `defaultLaunchConfig` for runtime/model/config. Do not add duplicate runtime/model fields to the compaction settings card.
- Remove the active-run-model fallback and the global `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER` steady-state path. Missing/invalid compactor agent configuration must fail explicitly when compaction is required.
- Treat legacy direct-model compaction behavior as invalid target-state behavior, not as a compatibility mode; production code must remove these paths rather than hide them behind flags.
- Do **not** add hidden/internal-run framework semantics, internal task flags, or backend-specific bootstrap/thread changes for compaction. Use the top-level normal run API (`AgentRunService.createAgentRun` plus normal `AgentRun` operations) and keep framework changes minimal.
- Use a two-layer prompt ownership split: strengthen the default compactor `agent.md` so stable behavior, category guidance, preservation/drop rules, and manual-test guidance live with the editable compactor agent; keep the exact current JSON schema/output contract in each automated task envelope as the authoritative parser contract owned by memory compaction.
- Simplify the compactor output contract by removing free-form `tags` and optional model-generated `reference` from semantic entries. If tag/facet/source-pointer retrieval is needed later, design it as a controlled memory-indexing feature rather than extra free-form fields in this compactor contract.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

## In-Scope Use Cases

- UC-001: A native AutoByteus parent run crosses the compaction threshold; before the next dispatch, the parent runtime delegates summarization to the globally selected compactor agent and then continues with a compacted snapshot.
- UC-002: A primary agent uses runtime/model A while the globally selected compactor agent uses runtime/model B, including a server-managed runtime such as Codex or Claude agent SDK when configured on the compactor agent definition.
- UC-003: A user updates the compactor agent's `agent.md` instructions and subsequent compactions use those instructions without changing any primary agent instructions.
- UC-004: In Server Settings -> Basics -> Compaction, a user selects the compactor agent by agent definition id/name. The selected agent's normal default launch preferences determine compaction runtime/model/config.
- UC-005: Compaction still produces the existing structured output shape: episodic summary plus typed semantic categories that the parser/normalizer/store/snapshot pipeline can consume.
- UC-006: Missing, invalid, or failing compactor-agent configuration surfaces a clear compaction failure and does not silently fall back to the primary agent model.
- UC-007: Parent compaction lifecycle events remain visible (`requested`, `started`, `completed`, `failed`) and include compactor agent/runtime/model/run identity where available.
- UC-008: Each compaction execution creates a normal visible compactor agent run that appears in run history so the user can inspect compaction input/output and diagnose quality.
- UC-009: The compactor run is a separate run with its own run id and memory directory, so it does not pollute the parent run's memory.
- UC-010: On a fresh server install, a default Memory Compactor agent definition exists in the normal app-data agents home, is selected by default for compaction, and is visible/editable like a normal shared agent.
- UC-011: API/E2E validation can configure an AutoByteus parent run to trigger compaction while the selected compactor agent uses Codex runtime, and can verify visible compactor run/history/status correlation.
- UC-012: A user can manually run the default Memory Compactor as a normal agent, paste arbitrary conversation/history content, and understand/test the compaction behavior from the agent's own `agent.md` instructions.

## Out of Scope

- Per-primary-agent or per-run compactor overrides for the first implementation. These can be a later extension after the global server-basics selector is stable.
- Redesigning the existing block/frontier planner, typed semantic memory schema, or snapshot rebuild algorithm beyond adapting the summarizer boundary.
- Mid-stream/background compaction while a provider stream is active.
- Multi-pass compaction, repair loops, or evaluator agents; the initial agent-based design remains one compaction task -> one structured output.
- Hidden/internal compaction run infrastructure, internal task flags in generic run config/manager, or backend-specific hidden-run behavior.
- Backend-specific tool suppression or bootstrap/thread/session modifications solely for compaction.
- Automatic selection of Codex, LM Studio, Qwen, or any environment-specific model as the default built-in compactor runtime/model. The built-in agent can be seeded and selected by default, but runtime/model availability is node-specific and must remain user/test configured through the agent's normal launch preferences.
- Migrating old `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER` values into compactor-agent configs. The target rejects old model-direct compatibility behavior.
- Enabling compaction for external primary runtimes that do not currently use `autobyteus-ts` memory compaction, except as a future extension of the same server runner.

## Functional Requirements

- REQ-001 `agent_owned_summarization`: Compaction summarization must execute through a compaction-agent runner boundary, not through direct `LLMFactory.createLLM(...)` calls from the memory compaction subsystem.
- REQ-002 `preserve_memory_owner`: `PendingCompactionExecutor`/`Compactor` must continue to own planning, persistence, pruning, normalization, and snapshot reset; the compactor agent must only produce the structured compaction response for selected blocks.
- REQ-003 `editable_agent_instructions`: A compactor agent must use independently editable instructions, separate from primary agent instructions.
- REQ-004 `runtime_model_independence`: A compactor agent configuration must support runtime kind, model identifier, and runtime-specific LLM/config parameters independent from the primary run by reusing the selected agent definition's existing default launch preferences.
- REQ-005 `server_global_compactor_selection`: Server-managed runs must resolve the compactor agent from a global server setting keyed by agent definition identity, proposed `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`.
- REQ-006 `server_basics_ui_binding`: `autobyteus-web` must replace the compaction model selector in `CompactionConfigCard.vue` with a compactor-agent selector that lists agent definitions and saves the selected agent id to server settings.
- REQ-007 `no_silent_model_fallback`: If no compactor agent can be resolved when compaction is required, the runtime must emit/throw a clear compaction preparation failure and must not silently use the active run model.
- REQ-008 `strict_output_contract`: The compactor agent output must still satisfy the current structured JSON contract consumed by `CompactionResponseParser`.
- REQ-009 `visible_normal_compactor_run`: Compactor agent execution must use the existing normal `AgentRunService` / `AgentRunManager` run creation path and must be visible in run history.
- REQ-010 `separate_run_isolation`: The compactor run must have its own run id and memory directory, and must not write into the parent run's memory manager or working context snapshot.
- REQ-011 `one_task_run_lifecycle`: The server runner must create a compactor run, post one compaction task, collect final output, record relevant run activity/status, and terminate the run after output/failure/timeout to avoid active-run leaks while preserving history.
- REQ-012 `normal_tool_framework_behavior`: The compactor run must not require backend-specific tool suppression. It should use normal run launch inputs; first implementation should launch conservatively with `autoExecuteTools=false` and `skillAccessMode=PRELOADED_ONLY` unless an existing launch preset source provides otherwise. If the compactor asks for tool approval instead of returning final JSON, compaction fails clearly and the visible run remains inspectable.
- REQ-013 `observability_identity`: Compaction lifecycle status/log payloads must include compactor agent identity plus runtime/model/compactor-run identity where resolved.
- REQ-014 `settings_cleanup`: Direct compaction model override settings and UI labels must be removed or replaced with compactor-agent configuration; ratio, active context override, and detailed logs remain valid.
- REQ-015 `testable_boundaries`: The runner, summarizer, missing-config behavior, settings resolver, UI binding, and server cross-runtime adapter must be testable with fakes without invoking real providers.
- REQ-016 `avoid_backend_bootstrap_invasion`: Implementation must not add compaction/internal-task behavior to Codex/Claude backend bootstrappers, Codex thread config/manager, generic `AgentRunConfig`, or generic `AgentRunManager` unless a separate approved design justifies it.
- REQ-017 `default_compactor_agent_seed`: Server startup must ensure a default compactor agent definition exists in the normal app-data agents directory, proposed id `autobyteus-memory-compactor`, with memory-compaction instructions and no environment-specific runtime/model assumption.
- REQ-018 `default_compactor_agent_selection`: If `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` is blank at startup, the server must persistently set it to the seeded default compactor agent id. If the setting already points to a user-selected agent, startup must not overwrite it.
- REQ-019 `default_compactor_agent_editability`: The seeded default compactor must be a normal shared visible/editable agent definition. Startup must not overwrite an existing agent directory with the same id, so user edits are preserved.
- REQ-020 `codex_compactor_e2e_required`: API/E2E validation for this ticket must include a scenario where a normal AutoByteus parent run triggers compaction and the selected compactor agent uses Codex runtime. If the required local Codex/AutoByteus/LM Studio environment is unavailable, validation must record an explicit environment blocker rather than claiming the scenario passed.
- REQ-021 `prompt_ownership_split`: The default compactor `agent.md` must own stable compaction behavior guidance and be manually testable as a normal agent, while automated compaction tasks must still include the exact current parser-required JSON contract in the per-task user message. The per-task prompt should avoid duplicating long behavioral prose and should primarily contain a short task envelope, current output contract, and settled blocks.
- REQ-022 `minimal_compaction_semantic_entry`: The compactor output contract must not require or request free-form `tags` or optional model-generated `reference` strings on semantic entries. Each semantic entry should be a minimal `{ "fact": "string" }` object inside the already typed output category array. Existing internal memory item `tags`/`reference` support may remain for other memory sources, but compactor-generated tags/references are out of scope for this contract.

## Acceptance Criteria

- AC-001: Static code inspection shows `LLMCompactionSummarizer` is removed/decommissioned from production wiring and compaction summarization uses `AgentCompactionSummarizer -> CompactionAgentRunner`.
- AC-002: A unit test verifies that `AgentCompactionSummarizer` sends the built compaction task to a fake runner and parses the returned JSON into the existing `CompactionResult` shape.
- AC-003: A unit/integration test configures primary model/runtime A and selected compactor agent runtime/model B, triggers compaction, and observes that compaction status/runner invocation reports B.
- AC-004: A test changes only the compactor agent instructions and verifies the compactor runner invocation uses that agent while the primary agent prompt remains unchanged.
- AC-005: A missing compactor agent setting/configuration test crosses the compaction threshold and observes a `CompactionPreparationError`/failed compaction status instead of a fallback to the active model.
- AC-006: A server settings test registers, persists, and reads `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`; the old `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER` is not used as the executor selection setting.
- AC-007: A server settings resolver test resolves the selected compactor agent definition and uses that definition's `defaultLaunchConfig` as the compaction runtime/model/config.
- AC-008: A fake server runner test creates a normal visible agent run through an `AgentRunService` fake, posts the compaction task, collects final text from normal run events, terminates the run, and returns only the compaction output to `autobyteus-ts`.
- AC-009: A history/metadata test verifies that compactor runs are recorded as normal visible runs and include enough identity to inspect which compaction attempt produced the output.
- AC-010: Existing compaction planner, parser, normalizer, store, and snapshot tests continue to pass without changes to their output semantics except status identity fields.
- AC-011: No production code path reads `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER` or falls back to the primary model as the compaction executor.
- AC-012: `CompactionConfigCard.vue` lists existing agent definitions as compactor-agent options, saves the selected agent id to server settings, and no longer offers “Use active run model”.
- AC-013: Static code inspection shows no new compaction-specific `internalTask`/hidden-run fields or branches in Codex/Claude bootstrappers, Codex thread config/manager, generic `AgentRunConfig`, or generic `AgentRunManager`.
- AC-014: Documentation describes how to create/edit a compactor agent, select it in Server Settings -> Basics -> Compaction, and inspect visible compactor runs in history.
- AC-015: A startup/bootstrap test verifies the default `autobyteus-memory-compactor` agent is created in the normal agents directory when missing, selected through `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` when the setting is blank, and not overwritten when it already exists.
- AC-016: A startup/bootstrap test verifies an existing non-default compactor-agent setting is not overwritten by default seeding.
- AC-017: The seeded default compactor agent is returned by normal agent-definition listing/query paths and can be edited through normal shared-agent update paths.
- AC-018: API/E2E validation includes the AutoByteus-parent + Codex-compactor compaction scenario, verifies parent compaction status includes `compaction_run_id`, and verifies the compactor run is visible in history.
- AC-019: The seeded default compactor `agent.md` contains enough behavior/category/preservation/drop guidance for manual testing, and a task-builder test verifies automated compaction user messages include the exact JSON contract plus settled blocks without reintroducing a long duplicate behavior manual.
- AC-020: The default compactor `agent.md`, automated task contract, parser/normalizer tests, and docs no longer require model-generated `tags` or `reference` in compaction semantic entries; generated semantic memory remains categorized by the surrounding output array and stores only the fact text for each semantic item.

## Constraints / Dependencies

- `autobyteus-ts` must not import `autobyteus-server-ts`; cross-runtime implementation belongs in server or another lower-level shared package.
- Existing `CompactionResponseParser`, `CompactionResultNormalizer`, typed semantic-memory categories, and snapshot builder should be reused.
- Runtime-specific agent execution (`RuntimeKind`, Codex app server, Claude agent SDK) is currently server-owned behind normal `AgentRunService` / `AgentRunManager` boundaries.
- The parent run's compaction gate must remain synchronous with pre-dispatch request preparation: no next LLM dispatch until required compaction succeeds or fails explicitly.
- Visible compactor runs need deterministic termination after output/failure/timeout to avoid active-run leaks.
- The initial UX should not duplicate runtime/model fields in the compaction settings card; those stay on the selected agent's normal edit page.

## Assumptions

- The product can represent a compactor as a normal agent definition whose instructions are authored in `agent.md` and whose runtime/model are configured through existing default launch preferences.
- The server can seed a default shared agent definition into the existing app-data agents directory during startup without creating a new definition-storage mechanism.
- Server-managed runtime backends can be driven through the existing normal run service/manager path, and their normal event streams are sufficient to collect final output.
- A first implementation does not need special backend tool suppression. The safest default launch behavior is non-auto-executing tools plus visible failure if the compactor asks for tool approval instead of returning JSON.
- Existing compaction output categories remain acceptable and should not be broadened during this refactor; free-form `tags` and optional model-generated `reference` are removed from the compactor-facing schema to reduce weak-model output burden.
- Manual compactor testing is expected to be best-effort human inspection; production compatibility is enforced by the automated task envelope plus parser, not by trusting editable `agent.md` alone.

## Risks / Open Questions

- DQ-001: Default built-in compactor agent decision: yes, seed a normal shared visible/editable compactor agent for onboarding and persistently select it only when `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` is blank.
- OQ-002: Should per-primary-agent or per-run compactor overrides exist later? Recommendation: future extension only; first implementation should keep a single global Server Basics selector.
- OQ-003: Should visible compactor runs remain terminated after one compaction or be left active? Recommendation: terminate after final output/failure/timeout to avoid leaks; terminated runs remain visible in history.
- OQ-004: How strict should JSON output enforcement be for Codex/Claude? Recommendation: one parser attempt plus current fence/balanced-object extraction; failure remains a compaction failure, not a repair loop.
- OQ-005: Should compactor runs support auto-executed tools? Recommendation: future explicit compactor launch-policy setting if needed; first implementation should avoid backend-specific tool suppression and use normal conservative launch defaults.
- DQ-002: Compactor prompt ownership decision: use the two-layer split. Default `agent.md` owns stable behavior and manual-test guidance; the automated per-task user message owns the current exact JSON contract and payload envelope. Do not move the parser-required schema exclusively into editable agent instructions.
- DQ-003: Minimal compactor schema decision: remove free-form `tags` and optional model-generated `reference` from the compactor output contract for this ticket. Categories already classify entries, and preserving the fact text is the core value. Source pointers can be reintroduced later only with a clear deterministic/controlled design.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-002 |
| REQ-002 | UC-001, UC-005 |
| REQ-003 | UC-003 |
| REQ-004 | UC-002, UC-004 |
| REQ-005 | UC-004 |
| REQ-006 | UC-004 |
| REQ-007 | UC-006 |
| REQ-008 | UC-005 |
| REQ-009 | UC-008 |
| REQ-010 | UC-009 |
| REQ-011 | UC-008, UC-009 |
| REQ-012 | UC-008 |
| REQ-013 | UC-002, UC-007, UC-008 |
| REQ-014 | UC-004 |
| REQ-015 | UC-001, UC-002, UC-004, UC-006 |
| REQ-016 | UC-002, UC-008 |
| REQ-017 | UC-010 |
| REQ-018 | UC-010 |
| REQ-019 | UC-010 |
| REQ-020 | UC-011 |
| REQ-021 | UC-003, UC-005, UC-012 |
| REQ-022 | UC-005, UC-012 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 | Confirms clean-cut removal of model-direct production compaction. |
| AC-002 | Confirms the core summarizer boundary is agent-runner based and parser-compatible. |
| AC-003 | Confirms runtime/model independence. |
| AC-004 | Confirms instruction independence. |
| AC-005 | Confirms no silent active-model fallback. |
| AC-006 | Confirms durable server setting shape. |
| AC-007 | Confirms selected agent default launch config drives compaction runtime/model. |
| AC-008 | Confirms server can execute cross-runtime compaction through normal visible run APIs. |
| AC-009 | Confirms user-inspectable compactor history. |
| AC-010 | Confirms existing memory semantics survive the refactor. |
| AC-011 | Confirms old setting/fallback removal. |
| AC-012 | Confirms the intended Server Basics UX. |
| AC-013 | Confirms no hidden/internal backend-framework invasion. |
| AC-014 | Confirms operator/developer usability. |
| AC-015 | Confirms default compactor seed and default selection. |
| AC-016 | Confirms user-selected compactor setting is preserved. |
| AC-017 | Confirms the built-in/default compactor is still a normal visible/editable agent definition. |
| AC-018 | Confirms real end-to-end AutoByteus parent plus Codex compactor behavior. |
| AC-019 | Confirms the prompt ownership split: manually testable default agent instructions plus authoritative automated schema envelope. |
| AC-020 | Confirms compaction output schema simplification by removing nonessential tags/reference fields from the compactor-facing contract. |

## Approval Status

Refined after user/implementation design-impact feedback on 2026-04-30. The current direction uses visible normal compactor runs through existing top-level run APIs, adds a normal seeded default compactor agent definition, requires Codex-compactor API/E2E validation, preserves clean-cut removal of direct-model compaction, clarifies prompt ownership with strengthened default `agent.md` behavior plus an authoritative per-task JSON schema envelope, and simplifies the compactor output contract to facts-only semantic entries by removing free-form `tags` and optional model-generated `reference`.
