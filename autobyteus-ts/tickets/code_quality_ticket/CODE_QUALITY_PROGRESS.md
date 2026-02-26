# Code Quality Progress Record

This document tracks the TS code-quality pass (naming + stronger typing).

## Legend
- **Status:** `Pending`, `In Progress`, `Completed`
- **Notes:** brief description of naming/type changes

## Progress Log
- 2026-01-30: Updated `ApiToolCallStreamingResponseHandler` to defer TOOL_CALL segment start until tool name is known (handles args-first deltas) and to flush pending content once the name arrives.
- 2026-01-30: Updated live tool-call handler integration tests to use camelCase `onSegmentEvent` callback (OpenAI/Gemini/Mistral).
- 2026-01-30: Ran `pnpm exec vitest tests/unit/agent/streaming/handlers/api_tool_call_streaming_response_handler.test.ts` (passed).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/agent/handlers/gemini_tool_call_handler_live.test.ts` (passed).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/agent/handlers/mistral_tool_call_handler_live.test.ts` (passed).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/agent/handlers/api_tool_call_handler_live.test.ts` (failed: OpenAI quota exceeded).
- 2026-01-30: Fixed TypeScript build errors across agent/tool/LLM/multimedia/MCP utilities (typing guards, ToolClass typing, MCP schema/config typing, Autobyteus/OpenAI parsing, workspace helper fixes).
- 2026-01-30: Ran `pnpm exec tsc -p tsconfig.examples.json` (passed).
- 2026-01-30: Ran `pnpm exec vitest tests/unit` (passed; expected warnings for SSL cert + negative-case logs).
- 2026-01-30: Reviewed remaining tools/usage formatters/indexes/providers/utilities; updated typing in `load_skill`, `dynamic_enum`, `html_cleaner`, `llm_output_formatter`, `logger`, `parameter_schema`, and made SearchClient strategy readonly.
- 2026-01-30: Ran `pnpm exec vitest tests/unit/utils tests/unit/tools/skill/load_skill.test.ts` (passed).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/tools/skill/load_skill.test.ts tests/integration/utils/dynamic_enum.test.ts tests/integration/utils/html_cleaner.test.ts` (passed).
- 2026-01-30: Ran `pnpm exec vitest tests/unit` (all unit tests passed; expected warnings for missing SSL cert + negative-case logs).
- 2026-01-30: Re-ran targeted integration tests after unit sweep (`tests/integration/tools/skill/load_skill.test.ts`, `tests/integration/utils/dynamic_enum.test.ts`, `tests/integration/utils/html_cleaner.test.ts`) (passed).
- 2026-01-30: Ran integration tests for terminal tools + event bus + media reader (`tests/integration/events/event_bus.test.ts`, `tests/integration/tools/terminal/*`, `tests/integration/tools/multimedia/media_reader_tool.test.ts`) (passed).
- 2026-01-30: Ran MCP integration tests (`tests/integration/tools/mcp/http_managed_mcp_server.test.ts`, `stdio_managed_mcp_server.test.ts`, `websocket_managed_mcp_server.test.ts`, `tool_registrar.test.ts`) (passed; warnings from MCP servers + TLS env).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/tools/multimedia/download_media_tool.test.ts` (passed).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/tools/multimedia/image_tools.test.ts` (timed out after 120s; Autobyteus image model discovery succeeded but generation did not complete).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/multimedia/image/api/autobyteus_image_client.test.ts` (passed; SSL cert warnings).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/multimedia/audio/api/autobyteus_audio_client.test.ts` (failed: Autobyteus server 500 with `click: Timeout 30000ms exceeded` while generating speech).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/llm/api/lmstudio_llm.test.ts tests/integration/llm/api/ollama_llm.test.ts` (passed; SSL cert + default token limit warnings).
- 2026-01-30: Ran agent flow integration tests (`tests/integration/agent/agent_single_flow.test.ts`, `agent_single_flow_xml.test.ts`, `agent_dual_flow.test.ts`, `tool_approval_flow.test.ts`) (passed; SSL cert warnings; Autobyteus model discovery 401 warnings during XML/dual flow).
- 2026-01-30: Ran agent team integration tests (`tests/integration/agent_team/agent_team_single_flow.test.ts`, `agent_team_streaming_flow.test.ts`, `agent_team_subteam_streaming_flow.test.ts`) (passed; SSL cert + default token limit warnings).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/llm/api/autobyteus_llm.test.ts` (passed; SSL cert + default token limit warnings).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/multimedia/image/api/openai_image_client.test.ts` (failed: OpenAI 400 billing hard limit reached).
- 2026-01-30: Ran OpenAI LLM integration tests (`tests/integration/llm/api/openai_llm.test.ts`, `openai_llm_image.test.ts`, `openai_compatible_llm.test.ts`). OpenAI LLM/image failed with 429 quota exceeded; openai_compatible passed.
- 2026-01-30: Ran `pnpm exec vitest tests/integration/llm/api/gemini_llm.test.ts` (passed).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/llm/api/anthropic_llm.test.ts tests/integration/llm/api/anthropic_llm_image.test.ts` (passed; expected invalid-image warnings).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/llm/api/mistral_llm.test.ts tests/integration/llm/api/deepseek_llm.test.ts` (passed).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/llm/api/grok_llm.test.ts tests/integration/llm/api/kimi_llm.test.ts` (passed).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/llm/api/qwen_llm.test.ts tests/integration/llm/api/zhipu_llm.test.ts` (zhipu passed; qwen tests skipped by suite).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/tools/multimedia/audio_tools.test.ts` (passed; 1 skipped; SSL cert warning).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/multimedia/image/api/gemini_image_client.test.ts tests/integration/multimedia/audio/api/gemini_audio_client.test.ts` (passed; 1 skipped; SSL cert warnings).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/multimedia/audio/api/openai_audio_client.test.ts` (failed: OpenAI 429 quota exceeded).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/skills/loader.test.ts tests/integration/skills/registry.test.ts` (passed).
- 2026-01-30: Ran non-API LLM integration tests (base/enums/models/user_message/converters/token_counter/extensions/utils/llm_reloading) via targeted `pnpm exec vitest` command (all passed; expected SSL/default token limit warnings and reload logs).
- 2026-01-30: Ran integration tests for core tools (base/functional/meta/state/config/category/origin/utils/file/registry/tool_factory/read_url) in one batch (passed; expected schema-validation stderr).
- 2026-01-30: Ran integration tests for search tooling (search_tool + search client/factory/providers/strategies) (passed).
- 2026-01-30: Ran additional agent integration tests (`agent_skills`, `agent_runtime`, `streaming/full_streaming_flow`, `streaming/json_tool_styles_integration`) (passed; SSL cert warnings).
- 2026-01-30: Standardized streaming parser state hooks/factory names and FileContent stream update fields; removed `stream_queue_items` alias export.
- 2026-01-30: Updated streaming parser unit tests (`state_factory`, `json_parsing_states`, `file_content_streamer`) for camelCase APIs.
- 2026-01-30: Ran `pnpm exec vitest tests/unit/agent/streaming` (passed).
- 2026-01-30: Re-ran `pnpm exec vitest tests/unit/agent/streaming` after streaming state factory/update changes (passed).
- 2026-01-30: Tightened agent_team streaming payload typing, fixed `validate_payload` shadowing bug, and ran `pnpm exec vitest tests/unit/agent_team/streaming` (passed).
- 2026-01-30: Updated Autobyteus client typing/naming and ran `pnpm exec vitest tests/unit/clients/autobyteus_client.test.ts tests/unit/clients/cert_utils.test.ts` (passed).
- 2026-01-30: Renamed EventManager internals to camelCase and ran `pnpm exec vitest tests/unit/events/event_manager.test.ts tests/unit/events/event_emitter.test.ts` (passed).
- 2026-01-30: Tightened CLI display payload typing and ran `pnpm exec vitest tests/unit/cli/cli_display.test.ts` (passed).
- 2026-01-30: Standardized CLI exports to camelCase and updated examples to use `runAgentCli`/`runAgentTeamCli`.
- 2026-01-30: Reviewed agent processor/workspace index files (`system_prompt_processor/index`, `tool_execution_result_processor/index`, `tool_invocation_preprocessor/index`, `workspace/index`, `workspace_config`) — no changes needed.
- 2026-01-30: Typed `BaseAgentTeamEventHandler` with `AgentTeamContext` and ran `pnpm exec vitest tests/unit/agent_team/handlers/agent_team_event_handler_registry.test.ts` (passed).
- 2026-01-30: Reviewed agent_team index/base step files (`factory/index`, `runtime/index`, `context/index`, `bootstrap_steps/base_agent_team_bootstrap_step`, `shutdown_steps/base_agent_team_shutdown_step`) — no changes needed.
- 2026-01-30: Restored direct `teamContext` access in task-management tools for readability and ran `pnpm exec vitest tests/unit/task_management/tools/task_tools` (passed).
- 2026-01-30: Ran full unit test suite `pnpm exec vitest tests/unit` (passed; expected warnings for SSL cert + negative-case logs).
- 2026-01-30: Renamed agent team status helper to `isTerminal` and updated runtime usage.
- 2026-01-30: Ran `pnpm exec vitest tests/unit/agent_team/runtime/agent_team_runtime.test.ts` (passed).
- 2026-01-30: Reviewed agent index/support files (`factory/index`, `handlers/base_event_handler`, `input_processor/index`, `lifecycle/*`, `llm_response_processor/index`, `runtime/index`, `sender_type`, `shutdown_steps/*`, `status_enum`) — no changes needed.
- 2026-01-30: Reviewed `src/agent/message/index.ts` (no changes needed).
- 2026-01-30: Reviewed `src/agent/message/context_file_type.ts` (no changes needed).
- 2026-01-30: Standardized `InterAgentMessage`/`InterAgentMessageType` to camelCase fields/helpers and updated inter-agent handlers/tests.
- 2026-01-30: Ran `pnpm exec vitest tests/unit/agent/message/inter_agent_message.test.ts tests/unit/agent/message/inter_agent_message_type.test.ts tests/unit/agent/handlers/inter_agent_message_event_handler.test.ts tests/unit/task_management/tools/task_tools/assign_task_to.test.ts tests/unit/agent_team/handlers/inter_agent_message_request_event_handler.test.ts tests/unit/agent/agent.test.ts` (passed).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/agent_team/agent_team_single_flow.test.ts` (passed; warnings: SSL cert unset + Autobyteus model discovery 401).
- 2026-01-30: Updated agent/agent_team input event queue managers to camelCase queue names/methods; typed agent_team internal events.
- 2026-01-30: Updated queue manager call sites/tests for camelCase queue APIs.
- 2026-01-30: Ran `pnpm exec vitest tests/unit/agent/events/agent_input_event_queue_manager.test.ts tests/unit/agent/events/worker_event_dispatcher.test.ts tests/unit/agent/runtime/agent_worker.test.ts tests/unit/agent/runtime/agent_runtime.test.ts tests/unit/agent_team/events/agent_team_event_dispatcher.test.ts tests/unit/agent_team/runtime/agent_team_worker.test.ts tests/unit/agent_team/runtime/agent_team_runtime.test.ts` (passed).
- 2026-01-30: Re-ran `pnpm exec vitest tests/integration/agent/tool_approval_flow.test.ts` (passed; SSL cert warning due to missing `AUTOBYTEUS_SSL_CERT_FILE`).
- 2026-01-30: Backfilled progress table with remaining migration-list TS files as Pending entries.
- 2026-01-30: Updated `examples/discover_status_transitions.ts` to use camelCase AgentStatusDeriver context keys.
- 2026-01-30: Reviewed `examples/shared/logging.ts` (no changes needed).
- 2026-01-30: Renamed AgentBootstrapper `bootstrapSteps` and updated related test.
- 2026-01-30: Ran `pnpm exec vitest tests/unit/agent/bootstrap_steps/agent_bootstrapper.test.ts` (passed).
- 2026-01-30: Reviewed `src/agent/bootstrap_steps/base_bootstrap_step.ts` (no changes needed).
- 2026-01-30: Reviewed `src/agent/context/index.ts` (no changes needed).
- 2026-01-30: Standardized agent/agent_team event models to camelCase fields and updated handlers/tests accordingly.
- 2026-01-30: Ran `pnpm exec vitest tests/unit/agent/events/agent_events.test.ts tests/unit/agent/events/agent_input_event_queue_manager.test.ts tests/unit/agent/status/status_update_utils.test.ts tests/unit/agent/status/status_deriver.test.ts tests/unit/agent/handlers/bootstrap_event_handler.test.ts tests/unit/agent/handlers/user_input_message_event_handler.test.ts tests/unit/agent/handlers/inter_agent_message_event_handler.test.ts tests/unit/agent/handlers/llm_user_message_ready_event_handler.test.ts tests/unit/agent/handlers/llm_complete_response_received_event_handler.test.ts tests/unit/agent/handlers/tool_execution_approval_event_handler.test.ts tests/unit/agent/handlers/approved_tool_invocation_event_handler.test.ts tests/unit/agent/handlers/tool_result_event_handler.test.ts tests/unit/agent/message/send_message_to.test.ts tests/unit/agent_team/events/agent_team_events.test.ts tests/unit/agent_team/handlers/inter_agent_message_request_event_handler.test.ts tests/unit/agent_team/handlers/process_user_message_event_handler.test.ts tests/unit/agent_team/handlers/tool_approval_team_event_handler.test.ts tests/unit/agent_team/task_notification/task_activator.test.ts tests/unit/agent_team/agent_team.test.ts tests/unit/agent_team/status/status_update_utils.test.ts` (passed).
- 2026-01-29: Initialized code-quality ticket with strategy/progress docs.
- 2026-01-29: Completed first batch (task management + agent team task notification + TUI state store).
- 2026-01-29: Updated tests and supporting code; MCP integration tests deferred due to `uv` spawn issues in Vitest.
- 2026-01-29: Ran `pnpm exec vitest` for targeted unit tests (agent factory, event handler registries, stream payloads/stream).
- 2026-01-29: Ran `pnpm exec vitest` for targeted unit tests (agent/agent_team methods, event streams, event stores, streaming handlers).
- 2026-01-29: Ran `pnpm exec vitest` for targeted unit tests (agent team factory/builder/team manager).
- 2026-01-29: Ran `pnpm exec vitest` for targeted unit tests (base workspace, agent runtime state, agent team builder, prompt template).
- 2026-01-30: Updated task plan internals (teamId/taskStatuses), streaming handler factory options, MCP tool factory naming, team manifest injection, and agent/team status derivers.
- 2026-01-30: Updated unit tests across task management, agent runtime, streaming handler factory, terminal tools, MCP factory, and event types.
- 2026-01-30: Ran `pnpm exec vitest tests/unit` (all unit tests passed).
- 2026-01-30: Built `node-pty` native module via `pnpm dlx node-gyp rebuild` (linux-x64 prebuild missing).
- 2026-01-30: Ran terminal integration tests individually (`terminal_tools`, `terminal_session_manager`, `background_process_manager`) — all passed.
- 2026-01-30: Backfilled progress entries for previously updated agent/agent_team/cli/examples/tests files.
- 2026-01-30: Tightened core tool framework typing (BaseTool/FunctionalTool/ToolConfig/ToolState/ToolRegistry/ToolDefinition) and updated tool index exports + tests.
- 2026-01-30: Updated file/search/terminal/web tools for camelCase internals, stronger typing, and refreshed terminal unit/integration tests.
- 2026-01-30: Updated tool usage formatters to reduce `any` usage and clarify output typing.
- 2026-01-30: Ran `pnpm exec vitest tests/unit` (all unit tests passed).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/agent/tool_approval_flow.test.ts` (passed).
- 2026-01-30: Removed snake_case fallback exports/aliases in terminal tooling + tools index; cleaned TerminalResult/ProcessInfo JSON output.
- 2026-01-30: Ran `pnpm exec vitest tests/unit` (all unit tests passed).
- 2026-01-30: Ran terminal integration tests individually (`terminal_tools`, `terminal_session_manager`, `background_process_manager`, `pty_session`) — all passed.
- 2026-01-30: Compared migration progress list against code-quality progress — remaining entries are non-TS example/prompt assets only (no TS source/test gaps identified).
- 2026-01-30: Recorded non-TS assets from migration list as reviewed (no code-quality changes required).
- 2026-01-30: Ran full integration test suite (121 files) in batches. **Pass:** 109, **Fail:** 9, **Timeout:** 3. Failures: `tests/integration/agent/agent_skills.test.ts`, `tests/integration/agent/runtime/agent_runtime.test.ts`, `tests/integration/llm/api/gemini_llm.test.ts`, `tests/integration/llm/llm_reloading.test.ts`, `tests/integration/tools/mcp/http_managed_mcp_server.test.ts`, `tests/integration/tools/mcp/stdio_managed_mcp_server.test.ts`, `tests/integration/tools/mcp/tool_registrar.test.ts`, `tests/integration/tools/mcp/websocket_managed_mcp_server.test.ts`, `tests/integration/tools/multimedia/download_media_tool.test.ts`. Timeouts (skipped): `tests/integration/llm/api/ollama_llm.test.ts`, `tests/integration/multimedia/image/api/openai_image_client.test.ts`, `tests/integration/tools/multimedia/image_tools.test.ts`.
- 2026-01-30: Failure reasons recorded from logs. `agent_skills.test.ts` failed because `system_prompt_processors` is not iterable; `agent_runtime.test.ts` uses removed private factory helper and references `llm_instance` cleanup; `gemini_llm.test.ts` failed with 429 RESOURCE_EXHAUSTED (Gemini rate limit); `llm_reloading.test.ts` afterEach hook timed out (LM Studio discovery slow/unavailable); MCP tests failed due to missing `uv` binary (`/home/ryan-ai/.local/bin/uv`); `download_media_tool.test.ts` failed with ECONNREFUSED to local media server `192.168.2.124:29695`. Timeouts: `ollama_llm.test.ts` exceeded runner limit while LM Studio unreachable; `openai_image_client.test.ts` and `image_tools.test.ts` exceeded runner limit during image generation (also remote image URL refused in image_tools).
- 2026-01-30: Fixed internal integration failures in `agent_skills.test.ts` (updated `systemPromptProcessors`) and `agent_runtime.test.ts` (build local handler registry + camelCase config fields). Ran `pnpm exec vitest tests/unit` (passed) and re-ran `tests/integration/agent/agent_skills.test.ts` + `tests/integration/agent/runtime/agent_runtime.test.ts` (passed). Remaining failures are external-service dependent.
- 2026-01-30: Remaining integration failures/timeouts after internal fixes (external dependencies): `tests/integration/llm/api/gemini_llm.test.ts` (Gemini 429 rate limit), `tests/integration/multimedia/image/api/openai_image_client.test.ts` (OpenAI billing hard limit 400), `tests/integration/tools/multimedia/image_tools.test.ts` (image generation timeout/remote URL issues), `tests/integration/multimedia/audio/api/autobyteus_audio_client.test.ts` (Autobyteus server 500 click timeout). 
- 2026-01-30: Reviewed `docs/` for legacy naming; no updates required (docs are current).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/llm/api/lmstudio_llm.test.ts` (passed).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/llm/api/ollama_llm.test.ts` (passed).
- 2026-01-30: Updated Autobyteus multimedia integration tests to run when host+key are configured and to honor explicit model IDs via env (`AUTOBYTEUS_IMAGE_MODEL_ID`, `AUTOBYTEUS_AUDIO_MODEL_ID`); updated `.env.test` accordingly.
- 2026-01-30: Ran `pnpm exec vitest tests/integration/multimedia/image/api/autobyteus_image_client.test.ts` (passed).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/multimedia/audio/api/autobyteus_audio_client.test.ts` (failed: Autobyteus server returned 500 with `click: Timeout 30000ms exceeded` while generating speech for model `gemini-2.5-flash-tts-rpa@192.168.2.124:51739`).
- 2026-01-30: Re-ran `pnpm exec vitest tests/integration/multimedia/audio/api/autobyteus_audio_client.test.ts` (failed again with the same Autobyteus server 500 `click: Timeout 30000ms exceeded` error for `gemini-2.5-flash-tts-rpa@192.168.2.124:51739`).
- 2026-01-30: Re-ran `pnpm exec vitest tests/integration/llm/llm_reloading.test.ts` (passed).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/tools/multimedia/download_media_tool.test.ts` (passed).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/multimedia/image/api/openai_image_client.test.ts` (failed: OpenAI 400 billing hard limit reached).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/agent/agent_single_flow.test.ts` (failed: OpenAI quota exceeded during Responses API streaming; tool call never executed).
- 2026-01-30: Switched agent/agent_team flow integration tests to use LM Studio via shared helper (`tests/integration/helpers/lmstudio_llm_helper.ts`) with local model selection and tool_choice enforcement; updated flow tests accordingly.
- 2026-01-30: Ran LM Studio agent flow tests: `tests/integration/agent/agent_single_flow.test.ts`, `tests/integration/agent/agent_single_flow_xml.test.ts`, `tests/integration/agent/agent_dual_flow.test.ts` (all passed).
- 2026-01-30: Ran LM Studio agent team flow tests: `tests/integration/agent_team/agent_team_single_flow.test.ts`, `tests/integration/agent_team/streaming/agent_team_streaming_flow.test.ts`, `tests/integration/agent_team/streaming/agent_team_subteam_streaming_flow.test.ts` (all passed).
- 2026-01-30: Identified MCP integration failures were due to incorrect repo root resolution (one directory too high) causing `autobyteus_mcps` lookup to fail and `spawn` to throw ENOENT.
- 2026-01-30: Fixed MCP test repo root (`../../../..`) in `http_managed_mcp_server`, `stdio_managed_mcp_server`, `websocket_managed_mcp_server`, `tool_registrar` and re-ran all four (passed).
- 2026-01-30: Standardized processor registries/definitions/base processors to camelCase (`getName`/`getOrder`/`isMandatory`/`processResponse`), removed snake_case APIs, and updated dependent handlers/status manager.
- 2026-01-30: Replaced Singleton `any` instance storage with typed static `instance` across registries/factories; tightened MCP/tool schema typing; updated XML tool parsing registry naming.
- 2026-01-30: Updated unit tests for processor naming and XML tool parsing registry; ran `pnpm exec vitest tests/unit` (passed).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/agent/tool_approval_flow.test.ts` (passed).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/tools/mcp/tool_registrar.test.ts` (passed).
- 2026-01-30: Updated MCP server classes (camelCase getters, typed transport/client) and MCP schema mapper/instance key/proxy naming; updated tests for new APIs.
- 2026-01-30: Ran `pnpm exec vitest tests/unit` (passed).
- 2026-01-30: Ran MCP integration tests: `tests/integration/tools/mcp/stdio_managed_mcp_server.test.ts`, `tests/integration/tools/mcp/http_managed_mcp_server.test.ts`, `tests/integration/tools/mcp/websocket_managed_mcp_server.test.ts` (all passed).
- 2026-01-30: Tightened `zod_schema_converter` typing (`unknown` defaults, safer enum/array schema handling).
- 2026-01-30: Ran `pnpm exec vitest tests/unit` (passed).
- 2026-01-30: Standardized agent message models to camelCase (`fileName`/`fileType`, `senderType`/`contextFiles`), tightened tool invocation typing, and updated handlers/tests accordingly.
- 2026-01-30: Ran `pnpm exec vitest tests/unit/agent/message/context_file.test.ts tests/unit/agent/message/agent_input_user_message.test.ts tests/unit/agent/handlers/user_input_message_event_handler.test.ts tests/unit/agent/handlers/tool_result_event_handler.test.ts tests/unit/agent/tool_invocation.test.ts tests/unit/tools/multimedia/media_reader_tool.test.ts` (passed).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/tools/multimedia/media_reader_tool.test.ts` (passed).
- 2026-01-30: Standardized LLM config/model naming to camelCase across LLM factory/providers/core APIs; aligned token usage tracking to `defaultConfig`/`pricingConfig`.
- 2026-01-30: Updated LLM unit/integration tests for camelCase config/model naming and pricing config inputs.
- 2026-01-30: Ran `pnpm exec vitest tests/unit/llm` (passed).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/llm/utils/llm_config.test.ts tests/integration/llm/llm_reloading.test.ts` (passed; warnings about missing `AUTOBYTEUS_SSL_CERT_FILE` and default token limit logs during discovery).
- 2026-01-30: Reviewed LLM message/response/token-usage/user-message schemas; retained snake_case fields for API compatibility.
- 2026-01-30: Tightened LLM base/extension kwargs typing to `Record<string, unknown>` and reduced `any` usage in tool call converters/Gemini tool normalization.
- 2026-01-30: Ran `pnpm exec vitest tests/unit/llm` (passed; expected stderr from media payload negative cases).
- 2026-01-30: Tightened multimedia audio/image typing (config/clients/providers) and reduced `any` usage across Autobyteus/Gemini/OpenAI clients.
- 2026-01-30: Ran `pnpm exec vitest tests/unit/multimedia` (passed; expected stderr from missing file + SSL cert warnings).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/multimedia/audio/autobyteus_audio_provider.test.ts tests/integration/multimedia/image/autobyteus_image_provider.test.ts` (passed; SSL cert warnings).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/multimedia/image/api/autobyteus_image_client.test.ts` (passed; SSL cert warnings).
- 2026-01-30: Ran `pnpm exec vitest tests/integration/multimedia/audio/api/autobyteus_audio_client.test.ts` (failed: Autobyteus server 500 `click: Timeout 30000ms exceeded`).
- 2026-01-30: Reviewed task_management schemas/index exports; retained snake_case fields for API compatibility.

## Progress Table
| File | Status | Notes |
| --- | --- | --- |
| `src/task_management/todo_list.ts` | Completed | camelCase methods/fields (`addTodo`, `getAllTodos`, etc.) |
| `src/task_management/tools/todo_tools/types.ts` | Completed | added typed tool context |
| `src/task_management/tools/todo_tools/add_todo.ts` | Completed | typed context + camelCase ToDoList calls |
| `src/task_management/tools/todo_tools/create_todo_list.ts` | Completed | typed context + camelCase ToDoList calls |
| `src/task_management/tools/todo_tools/get_todo_list.ts` | Completed | typed context + camelCase ToDoList calls |
| `src/task_management/tools/todo_tools/update_todo_status.ts` | Completed | typed context + camelCase ToDoList calls |
| `src/task_management/task.ts` | Completed | stronger typing in preprocess |
| `src/task_management/base_task_plan.ts` | Completed | camelCase API + typed status overview |
| `src/task_management/in_memory_task_plan.ts` | Completed | camelCase fields/methods + typed status overview |
| `src/task_management/converters/task_plan_converter.ts` | Completed | camelCase API (`toSchema`) |
| `src/task_management/tools/task_tools/types.ts` | Completed | typed task tool context |
| `src/task_management/tools/task_tools/create_task.ts` | Completed | direct teamContext access + camelCase TaskPlan calls |
| `src/task_management/tools/task_tools/create_tasks.ts` | Completed | direct teamContext access + camelCase TaskPlan calls |
| `src/task_management/tools/task_tools/assign_task_to.ts` | Completed | typed context + camelCase TeamManager call |
| `src/task_management/tools/task_tools/get_task_plan_status.ts` | Completed | direct teamContext access + camelCase converter call |
| `src/task_management/tools/task_tools/get_my_tasks.ts` | Completed | direct teamContext access + camelCase TaskPlan usage |
| `src/task_management/tools/task_tools/update_task_status.ts` | Completed | direct teamContext access + camelCase TaskPlan usage |
| `src/agent_team/task_notification/activation_policy.ts` | Completed | camelCase methods + exposed getter |
| `src/agent_team/task_notification/task_activator.ts` | Completed | camelCase API + typed TeamManager usage |
| `src/agent_team/task_notification/system_event_driven_agent_task_notifier.ts` | Completed | camelCase fields/methods + TeamManager typing |
| `src/agent_team/context/team_manager.ts` | Completed | camelCase public API |
| `src/agent_team/bootstrap_steps/coordinator_initialization_step.ts` | Completed | camelCase TeamManager usage + typing |
| `src/cli/agent_team/state_store.ts` | Completed | camelCase API + stronger typing |
| `src/cli/agent_team/app.tsx` | Completed | updated to new store API |
| `src/cli/agent_team/widgets/focus_pane_history.ts` | Completed | typed event payloads |
| `tests/unit/task_management/todo_list.test.ts` | Completed | updated for camelCase APIs |
| `tests/unit/task_management/tools/todo_tools/add_todo.test.ts` | Completed | updated for camelCase APIs |
| `tests/unit/task_management/tools/todo_tools/create_todo_list.test.ts` | Completed | updated for camelCase APIs |
| `tests/unit/task_management/tools/todo_tools/get_todo_list.test.ts` | Completed | updated for camelCase APIs |
| `tests/unit/task_management/tools/todo_tools/update_todo_status.test.ts` | Completed | updated for camelCase APIs |
| `tests/unit/task_management/base_task_plan.test.ts` | Completed | updated for camelCase APIs |
| `tests/unit/task_management/in_memory_task_plan.test.ts` | Completed | updated for camelCase APIs |
| `tests/unit/task_management/converters/task_plan_converter.test.ts` | Completed | updated for camelCase APIs |
| `tests/unit/task_management/tools/task_tools/create_task.test.ts` | Completed | updated for camelCase APIs |
| `tests/unit/task_management/tools/task_tools/create_tasks.test.ts` | Completed | updated for camelCase APIs |
| `tests/unit/task_management/tools/task_tools/assign_task_to.test.ts` | Completed | updated for camelCase APIs |
| `tests/unit/task_management/tools/task_tools/get_my_tasks.test.ts` | Completed | updated for camelCase APIs |
| `tests/unit/task_management/tools/task_tools/get_task_plan_status.test.ts` | Completed | updated for camelCase APIs |
| `tests/unit/task_management/tools/task_tools/update_task_status.test.ts` | Completed | updated for camelCase APIs |
| `tests/unit/agent_team/task_notification/activation_policy.test.ts` | Completed | updated for camelCase APIs |
| `tests/unit/agent_team/task_notification/task_activator.test.ts` | Completed | updated for camelCase APIs |
| `tests/unit/agent_team/task_notification/system_event_driven_agent_task_notifier.test.ts` | Completed | updated for camelCase APIs |
| `tests/unit/agent_team/bootstrap_steps/coordinator_initialization_step.test.ts` | Completed | updated for camelCase APIs |
| `code_quality_ticket/CODE_QUALITY_STRATEGY.md` | Completed | initial strategy for naming/typing sweep |
| `code_quality_ticket/CODE_QUALITY_PROGRESS.md` | Completed | progress tracking scaffold |
| `src/agent/message/send_message_to.ts` | Completed | typed context + camelCase TeamManager call |
| `src/agent_team/handlers/inter_agent_message_request_event_handler.ts` | Completed | camelCase locals + stronger typing |
| `src/agent_team/handlers/process_user_message_event_handler.ts` | Completed | camelCase locals + stronger typing |
| `src/agent_team/handlers/tool_approval_team_event_handler.ts` | Completed | camelCase locals + stronger typing |
| `src/agent_team/shutdown_steps/agent_team_shutdown_step.ts` | Completed | camelCase locals + typed TeamManager |
| `src/agent_team/shutdown_steps/sub_team_shutdown_step.ts` | Completed | camelCase locals + typed TeamManager |
| `src/agent_team/context/agent_team_context.ts` | Completed | camelCase node config accessor |
| `src/agent_team/context/agent_team_runtime_state.ts` | Completed | updated TeamManager method usage |
| `src/agent_team/bootstrap_steps/agent_configuration_preparation_step.ts` | Completed | camelCase locals + teamContext injection |
| `src/agent_team/bootstrap_steps/task_notifier_initialization_step.ts` | Completed | camelCase locals + typing |
| `src/agent_team/task_notification/system_event_driven_agent_task_notifier.ts` | Completed | camelCase notifier API |
| `tests/unit/agent/message/send_message_to.test.ts` | Completed | updated TeamManager mock + naming |
| `tests/unit/agent_team/context/team_manager.test.ts` | Completed | updated context accessor name |
| `tests/unit/agent_team/handlers/inter_agent_message_request_event_handler.test.ts` | Completed | updated TeamManager method usage |
| `tests/unit/agent_team/handlers/process_user_message_event_handler.test.ts` | Completed | updated TeamManager method usage |
| `tests/unit/agent_team/handlers/tool_approval_team_event_handler.test.ts` | Completed | updated TeamManager method usage |
| `tests/unit/agent_team/shutdown_steps/agent_team_shutdown_step.test.ts` | Completed | updated TeamManager method usage |
| `tests/unit/agent_team/shutdown_steps/sub_team_shutdown_step.test.ts` | Completed | updated TeamManager method usage |
| `tests/unit/agent_team/bootstrap_steps/task_notifier_initialization_step.test.ts` | Completed | updated notifier API |
| `tests/unit/agent_team/bootstrap_steps/agent_configuration_preparation_step.test.ts` | Completed | assert teamContext injection |
| `tests/unit/agent_team/bootstrap_steps/team_manifest_injection_step.test.ts` | Completed | updated context cache field name |
| `src/agent/handlers/event_handler_registry.ts` | Completed | camelCase getters + handler instance validation |
| `src/agent/status/manager.ts` | Completed | preserve nullable payload for notifier |
| `src/agent/events/worker_event_dispatcher.ts` | Completed | camelCase locals + registry getter rename |
| `src/agent/streaming/events/stream_event_payloads.ts` | Completed | camelCase creator helpers |
| `src/agent/streaming/streams/agent_event_stream.ts` | Completed | updated to camelCase creator helpers |
| `src/agent/streaming/handlers/streaming_response_handler.ts` | Completed | camelCase getters (`getAllEvents`, `getAllInvocations`) |
| `src/agent/streaming/handlers/parsing_streaming_response_handler.ts` | Completed | updated to camelCase getters |
| `src/agent/streaming/handlers/pass_through_streaming_response_handler.ts` | Completed | updated to camelCase getters |
| `src/agent/streaming/handlers/api_tool_call_streaming_response_handler.ts` | Completed | updated to camelCase getters |
| `src/agent/events/event_store.ts` | Completed | camelCase `allEvents` accessor |
| `src/agent/agent.ts` | Completed | camelCase messaging/approval APIs |
| `src/agent/utils/wait_for_idle.ts` | Completed | camelCase helper + variable naming |
| `src/agent_team/handlers/agent_team_event_handler_registry.ts` | Completed | camelCase getter |
| `src/agent_team/events/agent_team_event_dispatcher.ts` | Completed | camelCase locals + registry getter rename |
| `src/agent_team/streaming/agent_team_event_stream.ts` | Completed | tolerate runtime notifier + wrapped payload |
| `src/agent/factory/agent_factory.ts` | Completed | camelCase API (create/get/remove/list) + type guard |
| `src/agent_team/events/event_store.ts` | Completed | camelCase `allEvents` accessor |
| `src/agent_team/agent_team.ts` | Completed | camelCase messaging/approval APIs |
| `src/agent_team/utils/wait_for_idle.ts` | Completed | camelCase helper + variable naming |
| `src/agent_team/streaming/agent_event_bridge.ts` | Completed | updated to `allEvents` stream API |
| `src/agent_team/streaming/team_event_bridge.ts` | Completed | updated to `allEvents` stream API |
| `src/agent_team/factory/agent_team_factory.ts` | Completed | camelCase factory API |
| `src/agent_team/agent_team_builder.ts` | Completed | updated to camelCase factory API |
| `src/agent_team/context/team_manager.ts` | Completed | updated to camelCase factory API |
| `tests/unit/tools/search_tool.test.ts` | Completed | align _execute args with schema |
| `tests/unit/cli/agent_team_state_store.test.ts` | Completed | updated to camelCase API |
| `tests/unit/clients/cert_utils.test.ts` | Completed | resolve cert path across repo layouts |
| `tests/unit/agent/handlers/event_handler_registry.test.ts` | Completed | updated to camelCase getters |
| `tests/unit/agent_team/handlers/agent_team_event_handler_registry.test.ts` | Completed | updated to camelCase getter |
| `tests/unit/agent_team/factory/agent_team_factory.test.ts` | Completed | updated to camelCase getter |
| `tests/unit/agent/streaming/events/stream_event_payloads.test.ts` | Completed | updated to camelCase creators |
| `tests/unit/agent/streaming/streams/agent_event_stream.test.ts` | Completed | updated to camelCase creators |
| `tests/unit/agent/factory/agent_factory.test.ts` | Completed | updated to camelCase API |
| `tests/unit/agent/agent.test.ts` | Completed | updated to camelCase Agent APIs |
| `tests/unit/agent/events/event_store.test.ts` | Completed | updated to `allEvents` accessor |
| `tests/unit/agent/streaming/handlers/parsing_streaming_response_handler.test.ts` | Completed | updated to camelCase getters |
| `tests/unit/agent/streaming/handlers/pass_through_streaming_response_handler.test.ts` | Completed | updated to camelCase getters |
| `tests/unit/agent/streaming/handlers/api_tool_call_streaming_response_handler.test.ts` | Completed | updated to camelCase getters |
| `tests/unit/agent/status/status_update_utils.test.ts` | Completed | updated to `allEvents` accessor |
| `tests/unit/agent_team/agent_team.test.ts` | Completed | updated to camelCase Team APIs |
| `tests/unit/agent_team/handlers/inter_agent_message_request_event_handler.test.ts` | Completed | updated to camelCase Agent/Team APIs |
| `tests/unit/agent_team/handlers/process_user_message_event_handler.test.ts` | Completed | updated to camelCase Agent/Team APIs |
| `tests/unit/agent_team/handlers/tool_approval_team_event_handler.test.ts` | Completed | updated to camelCase Agent/Team APIs |
| `tests/unit/agent_team/streaming/agent_team_event_stream.test.ts` | Completed | updated to `allEvents` stream API |
| `tests/unit/agent_team/streaming/agent_event_bridge.test.ts` | Completed | updated to `allEvents` stream API |
| `tests/unit/agent_team/streaming/team_event_bridge.test.ts` | Completed | updated to `allEvents` stream API |
| `tests/unit/agent_team/status/status_update_utils.test.ts` | Completed | updated to `allEvents` accessor |
| `tests/unit/agent_team/factory/agent_team_factory.test.ts` | Completed | updated to camelCase factory API |
| `tests/unit/agent_team/agent_team_builder.test.ts` | Completed | updated to camelCase factory API |
| `tests/unit/agent_team/context/team_manager.test.ts` | Completed | updated to camelCase factory API |
| `tests/integration/agent/agent_single_flow.test.ts` | Completed | updated to camelCase factory API |
| `tests/integration/agent/agent_single_flow_xml.test.ts` | Completed | updated to camelCase factory API |
| `tests/integration/agent/agent_skills.test.ts` | Completed | updated to camelCase factory API |
| `tests/integration/agent/agent_dual_flow.test.ts` | Completed | updated to camelCase factory API |
| `tests/integration/agent/tool_approval_flow.test.ts` | Completed | updated to camelCase factory API |
| `tests/integration/agent/runtime/agent_runtime.test.ts` | Completed | updated to camelCase factory API |
| `tests/integration/agent/streaming/full_streaming_flow.test.ts` | Completed | updated to camelCase streaming handler APIs |
| `tests/integration/agent/streaming/json_tool_styles_integration.test.ts` | Completed | updated to camelCase streaming handler APIs |
| `tests/integration/agent/handlers/api_tool_call_handler_live.test.ts` | Completed | updated to camelCase streaming handler APIs |
| `tests/integration/agent/handlers/claude_tool_call_handler_live.test.ts` | Completed | updated to camelCase streaming handler APIs |
| `tests/integration/agent/handlers/mistral_tool_call_handler_live.test.ts` | Completed | updated to camelCase streaming handler APIs |
| `tests/integration/agent/handlers/gemini_tool_call_handler_live.test.ts` | Completed | updated to camelCase streaming handler APIs |
| `tests/integration/agent_team/streaming/agent_team_streaming_flow.test.ts` | Completed | updated to camelCase team APIs + `allEvents` |
| `tests/integration/agent_team/streaming/agent_team_subteam_streaming_flow.test.ts` | Completed | updated to camelCase team APIs + `allEvents` |
| `tests/integration/agent_team/agent_team_single_flow.test.ts` | Completed | updated to camelCase team APIs |
| `examples/run_agentic_software_engineer.ts` | Completed | updated to camelCase factory API |
| `examples/run_agent_with_skill.ts` | Completed | updated to camelCase factory API |
| `examples/run_poem_writer.ts` | Completed | updated to camelCase factory API |
| `src/tools/zod_schema_converter.ts` | Completed | safer `unknown` defaults + enum/array schema handling |
| `src/agent/message/context_file.ts` | Completed | camelCase fields + `unknown` metadata + snake_case serialization |
| `src/agent/message/agent_input_user_message.ts` | Completed | camelCase fields + `unknown` metadata + snake_case serialization |
| `src/agent/message/multimodal_message_builder.ts` | Completed | updated to camelCase message fields |
| `src/agent/handlers/user_input_message_event_handler.ts` | Completed | senderType handling + log message update |
| `src/agent/handlers/tool_result_event_handler.ts` | Completed | fileName usage + `isComplete` method |
| `src/agent/tool_invocation.ts` | Completed | `unknown` args/results + `isValid`/`isComplete` |
| `tests/unit/agent/message/context_file.test.ts` | Completed | updated camelCase field assertions |
| `tests/unit/agent/message/agent_input_user_message.test.ts` | Completed | updated camelCase field assertions |
| `tests/unit/agent/handlers/user_input_message_event_handler.test.ts` | Completed | updated senderType log assertion |
| `tests/unit/agent/handlers/tool_result_event_handler.test.ts` | Completed | updated camelCase field assertions |
| `tests/unit/agent/tool_invocation.test.ts` | Completed | updated `isValid`/`isComplete` assertions |
| `tests/unit/tools/multimedia/media_reader_tool.test.ts` | Completed | updated ContextFile field assertions |
| `tests/integration/tools/multimedia/media_reader_tool.test.ts` | Completed | updated ContextFile field assertions |
| `examples/run_browser_agent.ts` | Completed | updated to camelCase factory API |
| `examples/run_google_slides_agent.ts` | Completed | updated to camelCase factory API |
| `examples/run_sqlite_agent.ts` | Completed | updated to camelCase factory API |
| `tests/integration/tools/mcp/stdio_managed_mcp_server.test.ts` | Completed | resolve `uv` binary path |
| `tests/integration/tools/mcp/tool_registrar.test.ts` | Completed | resolve `uv` binary path |
| `tests/integration/tools/mcp/http_managed_mcp_server.test.ts` | Completed | resolve `uv` binary path |
| `tests/integration/tools/mcp/websocket_managed_mcp_server.test.ts` | Completed | resolve `uv` binary path |
| `src/agent/workspace/base_workspace.ts` | Completed | camelCase workspace API (`setContext`, `getBasePath`, `getName`) + workspaceId/agentId |
| `src/agent/bootstrap_steps/workspace_context_initialization_step.ts` | Completed | prefer `setContext` with backward-compatible fallback |
| `src/tools/multimedia/media_reader_tool.ts` | Completed | updated to `getBasePath` |
| `src/tools/multimedia/image_tools.ts` | Completed | updated to `getBasePath` |
| `src/tools/multimedia/audio_tools.ts` | Completed | updated to `getBasePath` |
| `src/tools/multimedia/download_media_tool.ts` | Completed | updated to `getBasePath` |
| `src/agent_team/agent_team_builder.ts` | Completed | camelCase builder API + local naming cleanup |
| `src/prompt/prompt_template.ts` | Completed | removed snake_case `to_dict` alias |
| `tests/unit/agent/workspace/base_workspace.test.ts` | Completed | updated for camelCase workspace API |
| `tests/unit/agent_team/agent_team_builder.test.ts` | Completed | updated for camelCase builder API |
| `tests/unit/prompt/prompt_template.test.ts` | Completed | validated camelCase template API |
| `tests/integration/agent/agent_single_flow.test.ts` | Completed | updated workspace `getBasePath` naming |
| `tests/integration/agent/agent_single_flow_xml.test.ts` | Completed | updated workspace `getBasePath` naming |
| `tests/integration/agent/agent_dual_flow.test.ts` | Completed | updated workspace `getBasePath` naming |
| `tests/integration/agent/tool_approval_flow.test.ts` | Completed | updated workspace `getBasePath` naming |
| `tests/integration/agent_team/agent_team_single_flow.test.ts` | Completed | updated workspace `getBasePath` naming |
| `tests/integration/agent_team/streaming/agent_team_streaming_flow.test.ts` | Completed | updated workspace `getBasePath` naming |
| `tests/integration/agent_team/streaming/agent_team_subteam_streaming_flow.test.ts` | Completed | updated workspace `getBasePath` naming |
| `examples/run_poem_writer.ts` | Completed | updated workspace `getBasePath` naming |
| `docs/nodejs_architecture.md` | Completed | reviewed for legacy naming; current |
| `docs/llm_module_design_nodejs.md` | Completed | reviewed for legacy naming; current |
| `examples/run_agentic_software_engineer.ts` | Completed | updated workspace `getBasePath` naming |
| `examples/agent_team/manual_notification/run_software_engineering_team.ts` | Completed | updated workspace `getBasePath` naming |
| `examples/agent_team/event_driven/run_software_engineering_team.ts` | Completed | updated workspace `getBasePath` naming |
| `src/agent/streaming/handlers/streaming_handler_factory.ts` | Completed | camelCase factory options + `toolSchemas` rename |
| `src/agent_team/status/status_deriver.ts` | Completed | fixed status field naming to avoid self-referential getter |
| `src/agent_team/bootstrap_steps/team_manifest_injection_step.ts` | Completed | switched to `systemPrompt` property |
| `src/tools/mcp/factory.ts` | Completed | camelCase internal fields |
| `tests/unit/agent/agent.test.ts` | Completed | updated `currentStatus` getter usage |
| `tests/unit/agent/runtime/agent_worker.test.ts` | Completed | updated `initialize` method name |
| `tests/unit/agent/runtime/agent_runtime.test.ts` | Completed | updated `handleWorkerCompletion` method name |
| `tests/unit/agent/status/status_deriver.test.ts` | Completed | updated `autoExecuteTools` context field |
| `tests/unit/agent/system_prompt_processor/register_system_prompt_processors.test.ts` | Completed | updated registry method names |
| `tests/unit/agent/streaming/handlers/streaming_handler_factory.test.ts` | Completed | updated factory option names + `toolSchemas` |
| `tests/unit/agent_team/streaming/agent_event_multiplexer.test.ts` | Completed | updated multiplexer method/field names |
| `tests/unit/events/event_types.test.ts` | Completed | updated task plan event names |
| `tests/unit/tools/mcp/factory.test.ts` | Completed | updated MCP factory field names |
| `tests/unit/tools/mcp/tool.test.ts` | Completed | updated context `agentId` |
| `tests/unit/tools/terminal/background_process_manager.test.ts` | Completed | aligned with snake_case session/output fields |
| `tests/unit/tools/terminal/terminal_session_manager.test.ts` | Completed | aligned with snake_case session fields |
| `tests/unit/tools/terminal/pty_session.test.ts` | Completed | aligned with `is_alive` accessor |
| `tests/unit/tools/terminal/types.test.ts` | Completed | aligned with snake_case output fields |
| `tests/integration/tools/terminal/terminal_tools.test.ts` | Completed | updated output assertions (`is_running`) |
| `tests/integration/tools/terminal/pty_session.test.ts` | Completed | updated `is_alive` assertions |

| `examples/agent_team/manual_notification/run_basic_research_team.ts` | Completed | updated for camelCase API changes |
| `examples/agent_team/manual_notification/run_debate_team.ts` | Completed | updated for camelCase API changes |
| `examples/agent_team/manual_notification/run_multi_researcher_team.ts` | Completed | updated for camelCase API changes |
| `examples/agent_team/manual_notification/run_team_with_tui.ts` | Completed | updated for camelCase API changes |
| `src/agent/bootstrap_steps/mcp_server_prewarming_step.ts` | Completed | camelCase naming/typing updates |
| `src/agent/bootstrap_steps/system_prompt_processing_step.ts` | Completed | camelCase naming/typing updates |
| `src/agent/context/agent_config.ts` | Completed | camelCase naming/typing updates |
| `src/agent/context/agent_context.ts` | Completed | camelCase naming/typing updates |
| `src/agent/context/agent_context_like.ts` | Completed | camelCase naming/typing updates |
| `src/agent/context/agent_context_registry.ts` | Completed | camelCase naming/typing updates |
| `src/agent/context/agent_runtime_state.ts` | Completed | camelCase naming/typing updates |
| `src/agent/events/notifiers.ts` | Completed | camelCase naming/typing updates |
| `src/agent/exceptions.ts` | Completed | camelCase naming/typing updates |
| `src/agent/handlers/approved_tool_invocation_event_handler.ts` | Completed | camelCase naming/typing updates |
| `src/agent/handlers/bootstrap_event_handler.ts` | Completed | camelCase naming/typing updates |
| `src/agent/handlers/generic_event_handler.ts` | Completed | camelCase naming/typing updates |
| `src/agent/handlers/inter_agent_message_event_handler.ts` | Completed | camelCase naming/typing updates |
| `src/agent/handlers/lifecycle_event_logger.ts` | Completed | camelCase naming/typing updates |
| `src/agent/handlers/llm_complete_response_received_event_handler.ts` | Completed | camelCase naming/typing updates |
| `src/agent/handlers/llm_user_message_ready_event_handler.ts` | Completed | camelCase naming/typing updates |
| `src/agent/handlers/tool_execution_approval_event_handler.ts` | Completed | camelCase naming/typing updates |
| `src/agent/handlers/tool_invocation_request_event_handler.ts` | Completed | camelCase naming/typing updates |
| `src/agent/handlers/tool_result_event_handler.ts` | Completed | camelCase naming/typing updates |
| `src/agent/handlers/user_input_message_event_handler.ts` | Completed | camelCase naming/typing updates |
| `src/agent/runtime/agent_runtime.ts` | Completed | camelCase naming/typing updates |
| `src/agent/runtime/agent_worker.ts` | Completed | camelCase naming/typing updates |
| `src/agent/shutdown_steps/agent_shutdown_orchestrator.ts` | Completed | camelCase naming/typing updates |
| `src/agent/shutdown_steps/llm_instance_cleanup_step.ts` | Completed | camelCase naming/typing updates |
| `src/agent/shutdown_steps/mcp_server_cleanup_step.ts` | Completed | camelCase naming/typing updates |
| `src/agent/shutdown_steps/tool_cleanup_step.ts` | Completed | camelCase naming/typing updates |
| `src/agent/status/index.ts` | Completed | camelCase naming/typing updates |
| `src/agent/status/status_deriver.ts` | Completed | camelCase naming/typing updates |
| `src/agent/status/status_update_utils.ts` | Completed | camelCase naming/typing updates |
| `src/agent/system_prompt_processor/available_skills_processor.ts` | Completed | camelCase naming/typing updates |
| `src/agent/system_prompt_processor/base_processor.ts` | Completed | camelCase naming/typing updates |
| `src/agent/system_prompt_processor/processor_definition.ts` | Completed | camelCase naming/typing updates |
| `src/agent/system_prompt_processor/processor_registry.ts` | Completed | camelCase naming/typing updates |
| `src/agent/system_prompt_processor/register_system_prompt_processors.ts` | Completed | camelCase naming/typing updates |
| `src/agent/system_prompt_processor/tool_manifest_injector_processor.ts` | Completed | camelCase naming/typing updates |
| `src/agent/utils/index.ts` | Completed | camelCase naming/typing updates |
| `src/agent_team/base_agent_team.ts` | Completed | camelCase naming/typing updates |
| `src/agent_team/bootstrap_steps/agent_team_bootstrapper.ts` | Completed | camelCase naming/typing updates |
| `src/agent_team/bootstrap_steps/team_context_initialization_step.ts` | Completed | camelCase naming/typing updates |
| `src/agent_team/context/agent_team_config.ts` | Completed | camelCase naming/typing updates |
| `src/agent_team/context/team_node_config.ts` | Completed | camelCase naming/typing updates |
| `src/agent_team/exceptions.ts` | Completed | camelCase naming/typing updates |
| `src/agent_team/handlers/lifecycle_agent_team_event_handler.ts` | Completed | camelCase naming/typing updates |
| `src/agent_team/runtime/agent_team_runtime.ts` | Completed | camelCase naming/typing updates |
| `src/agent_team/runtime/agent_team_worker.ts` | Completed | camelCase naming/typing updates |
| `src/agent_team/shutdown_steps/agent_team_shutdown_orchestrator.ts` | Completed | camelCase naming/typing updates |
| `src/agent_team/shutdown_steps/bridge_cleanup_step.ts` | Completed | camelCase naming/typing updates |
| `src/agent_team/status/agent_team_status_manager.ts` | Completed | camelCase naming/typing updates |
| `src/agent_team/status/status_update_utils.ts` | Completed | camelCase naming/typing updates |
| `src/agent_team/streaming/agent_event_multiplexer.ts` | Completed | camelCase naming/typing updates |
| `src/agent_team/streaming/agent_team_event_notifier.ts` | Completed | camelCase naming/typing updates |
| `src/agent_team/task_notification/task_notification_mode.ts` | Completed | camelCase naming/typing updates |
| `src/cli/agent/agent_cli.ts` | Completed | camelCase naming/typing updates |
| `src/events/event_emitter.ts` | Completed | camelCase naming/typing updates |
| `src/tools/mcp/tool.ts` | Completed | camelCase naming/typing updates |
| `tests/integration/events/event_bus.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/context/agent_config.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/context/agent_context.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/context/agent_context_registry.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/context/agent_runtime_state.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/events/notifiers.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/events/worker_event_dispatcher.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/exceptions.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/handlers/approved_tool_invocation_event_handler.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/handlers/bootstrap_event_handler.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/handlers/inter_agent_message_event_handler.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/handlers/lifecycle_event_logger.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/handlers/llm_complete_response_received_event_handler.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/handlers/llm_user_message_ready_event_handler.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/handlers/tool_execution_approval_event_handler.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/handlers/tool_invocation_request_event_handler.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/handlers/tool_result_event_handler.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/handlers/user_input_message_event_handler.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/shutdown_steps/agent_shutdown_orchestrator.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/shutdown_steps/llm_instance_cleanup_step.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/shutdown_steps/tool_cleanup_step.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/status/status_manager.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/system_prompt_processor/available_skills_processor.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/system_prompt_processor/base_processor.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/system_prompt_processor/processor_definition.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/system_prompt_processor/processor_registry.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent/system_prompt_processor/tool_manifest_injector_processor.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent_team/bootstrap_steps/agent_team_bootstrapper.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent_team/events/agent_team_event_dispatcher.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent_team/handlers/lifecycle_agent_team_event_handler.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent_team/runtime/agent_team_runtime.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent_team/runtime/agent_team_worker.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent_team/shutdown_steps/agent_team_shutdown_orchestrator.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent_team/shutdown_steps/bridge_cleanup_step.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent_team/status/agent_team_status_manager.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent_team/streaming/agent_team_event_notifier.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/agent_team/task_notification/task_notification_mode.test.ts` | Completed | updated for camelCase/typing changes |
| `tests/unit/events/event_emitter.test.ts` | Completed | updated for camelCase/typing changes |

| `src/tools/base_tool.ts` | Completed | added generics + replaced any with unknown in tool core |
| `src/tools/functional_tool.ts` | Completed | tightened typing (unknown) + args handling cleanup |
| `src/tools/tool_config.ts` | Completed | added getConstructorArgs + unknown-typed params |
| `src/tools/tool_state.ts` | Completed | unknown-typed state storage + generic get/set |
| `src/tools/registry/tool_definition.ts` | Completed | metadata typing + safer JSON usage types |
| `src/tools/registry/tool_registry.ts` | Completed | typed createTool + MCP metadata access |
| `src/tools/tool_meta.ts` | Completed | typed CATEGORY lookup |
| `src/tools/index.ts` | Completed | added camelCase exports with snake_case aliases |
| `tests/unit/tools/base_tool.test.ts` | Completed | updated for new BaseTool typing |
| `tests/unit/tools/tool_config.test.ts` | Completed | updated to getConstructorArgs |
| `tests/integration/tools/tool_config.test.ts` | Completed | updated to getConstructorArgs |
| `tests/unit/tools/index.test.ts` | Completed | assert camelCase exports |

| `src/tools/file/patch_file.ts` | Completed | camelCase params + safer error handling |
| `src/tools/file/read_file.ts` | Completed | camelCase params + safer error handling |
| `src/tools/file/write_file.ts` | Completed | camelCase params + safer error handling |
| `src/tools/search/base_strategy.ts` | Completed | replaced any with unknown in provider parsing |
| `src/tools/search/google_cse_strategy.ts` | Completed | replaced any with unknown in provider parsing |
| `src/tools/search/serpapi_strategy.ts` | Completed | replaced any with unknown in provider parsing |
| `src/tools/search/serper_strategy.ts` | Completed | replaced any with unknown in provider parsing |
| `src/tools/search_tool.ts` | Completed | typed tool args + camelCase locals |
| `src/tools/terminal/ansi_utils.ts` | Completed | camelCase terminal API + typed outputs |
| `src/tools/terminal/background_process_manager.ts` | Completed | camelCase terminal API + typed outputs |
| `src/tools/terminal/output_buffer.ts` | Completed | camelCase terminal API + typed outputs |
| `src/tools/terminal/prompt_detector.ts` | Completed | camelCase terminal API + typed outputs |
| `src/tools/terminal/pty_session.ts` | Completed | camelCase terminal API + typed outputs |
| `src/tools/terminal/session_factory.ts` | Completed | camelCase terminal API + typed outputs |
| `src/tools/terminal/terminal_session_manager.ts` | Completed | camelCase terminal API + typed outputs |
| `src/tools/terminal/tools/get_process_output.ts` | Completed | camelCase terminal API + typed outputs |
| `src/tools/terminal/tools/run_bash.ts` | Completed | camelCase terminal API + typed outputs |
| `src/tools/terminal/tools/start_background_process.ts` | Completed | camelCase terminal API + typed outputs |
| `src/tools/terminal/tools/stop_background_process.ts` | Completed | camelCase terminal API + typed outputs |
| `src/tools/terminal/types.ts` | Completed | camelCase terminal API + typed outputs |
| `src/tools/terminal/wsl_tmux_session.ts` | Completed | camelCase terminal API + typed outputs |
| `src/tools/terminal/wsl_utils.ts` | Completed | camelCase terminal API + typed outputs |
| `src/tools/web/read_url_tool.ts` | Completed | typed args + camelCase locals |
| `tests/integration/tools/terminal/background_process_manager.test.ts` | Completed | updated for camelCase terminal APIs |
| `tests/integration/tools/terminal/terminal_session_manager.test.ts` | Completed | updated for camelCase terminal APIs |
| `tests/unit/tools/terminal/ansi_utils.test.ts` | Completed | updated for camelCase terminal APIs |
| `tests/unit/tools/terminal/output_buffer.test.ts` | Completed | updated for camelCase terminal APIs |
| `tests/unit/tools/terminal/prompt_detector.test.ts` | Completed | updated for camelCase terminal APIs |
| `tests/unit/tools/terminal/session_factory.test.ts` | Completed | updated for camelCase terminal APIs |
| `tests/unit/tools/terminal/wsl_tmux_session.test.ts` | Completed | updated for camelCase terminal APIs |
| `tests/unit/tools/terminal/wsl_utils.test.ts` | Completed | updated for camelCase terminal APIs |

| `src/tools/usage/formatters/base_formatter.ts` | Completed | formatters: replaced any with unknown where possible |
| `src/tools/usage/formatters/default_json_schema_formatter.ts` | Completed | formatters: replaced any with unknown where possible |
| `src/tools/usage/formatters/openai_json_schema_formatter.ts` | Completed | formatters: replaced any with unknown where possible |
| `src/tools/usage/formatters/anthropic_json_schema_formatter.ts` | Completed | formatters: replaced any with unknown where possible |
| `src/tools/usage/formatters/gemini_json_schema_formatter.ts` | Completed | formatters: replaced any with unknown where possible |
| `src/tools/usage/formatters/google_json_schema_formatter.ts` | Completed | formatters: replaced any with unknown where possible |
| `src/tools/usage/formatters/mistral_json_schema_formatter.ts` | Completed | formatters: replaced any with unknown where possible |
| `src/tools/usage/formatters/default_json_example_formatter.ts` | Completed | formatters: replaced any with unknown where possible |
| `src/tools/usage/formatters/openai_json_example_formatter.ts` | Completed | formatters: replaced any with unknown where possible |
| `src/tools/usage/formatters/gemini_json_example_formatter.ts` | Completed | formatters: replaced any with unknown where possible |
| `src/tools/usage/formatters/google_json_example_formatter.ts` | Completed | formatters: replaced any with unknown where possible |
| `src/tools/usage/formatters/default_xml_schema_formatter.ts` | Completed | formatters: replaced any with unknown where possible |
| `src/tools/usage/formatters/default_xml_example_formatter.ts` | Completed | formatters: replaced any with unknown where possible |
| `examples/agent_team/README.md` | Completed | non-TS asset; no code-quality changes required |
| `examples/agent_team/event_driven/prompts/software_engineering/code_reviewer.prompt` | Completed | non-TS asset; no code-quality changes required |
| `examples/agent_team/event_driven/prompts/software_engineering/coordinator.prompt` | Completed | non-TS asset; no code-quality changes required |
| `examples/agent_team/event_driven/prompts/software_engineering/software_engineer.prompt` | Completed | non-TS asset; no code-quality changes required |
| `examples/agent_team/event_driven/prompts/software_engineering/tester.prompt` | Completed | non-TS asset; no code-quality changes required |
| `examples/agent_team/event_driven/run_software_engineering_team.py` | Completed | non-TS asset; no code-quality changes required |
| `examples/agent_team/manual_notification/prompts/software_engineering/code_reviewer.prompt` | Completed | non-TS asset; no code-quality changes required |
| `examples/agent_team/manual_notification/prompts/software_engineering/coordinator.prompt` | Completed | non-TS asset; no code-quality changes required |
| `examples/agent_team/manual_notification/prompts/software_engineering/software_engineer.prompt` | Completed | non-TS asset; no code-quality changes required |
| `examples/agent_team/manual_notification/prompts/software_engineering/tester.prompt` | Completed | non-TS asset; no code-quality changes required |
| `examples/agent_team/manual_notification/run_basic_research_team.py` | Completed | non-TS asset; no code-quality changes required |
| `examples/agent_team/manual_notification/run_debate_team.py` | Completed | non-TS asset; no code-quality changes required |
| `examples/agent_team/manual_notification/run_multi_researcher_team.py` | Completed | non-TS asset; no code-quality changes required |
| `examples/agent_team/manual_notification/run_software_engineering_team.py` | Completed | non-TS asset; no code-quality changes required |
| `examples/agent_team/manual_notification/run_team_with_tui.py` | Completed | non-TS asset; no code-quality changes required |
| `examples/discover_status_transitions.py` | Completed | non-TS asset; no code-quality changes required |
| `examples/mcp/calculator_server.py` | Completed | non-TS asset; no code-quality changes required |
| `examples/mcp/client.py` | Completed | non-TS asset; no code-quality changes required |
| `examples/prompts/agentic_software_engineer.prompt` | Completed | non-TS asset; no code-quality changes required |
| `examples/run_agent_with_skill.py` | Completed | non-TS asset; no code-quality changes required |
| `examples/run_agentic_software_engineer.py` | Completed | non-TS asset; no code-quality changes required |
| `examples/run_browser_agent.py` | Completed | non-TS asset; no code-quality changes required |
| `examples/run_google_slides_agent.py` | Completed | non-TS asset; no code-quality changes required |
| `examples/run_mcp_browser_client.py` | Completed | non-TS asset; no code-quality changes required |
| `examples/run_mcp_google_slides_client.py` | Completed | non-TS asset; no code-quality changes required |
| `examples/run_mcp_list_tools.py` | Completed | non-TS asset; no code-quality changes required |
| `examples/run_poem_writer.py` | Completed | non-TS asset; no code-quality changes required |
| `examples/run_sqlite_agent.py` | Completed | non-TS asset; no code-quality changes required |
| `examples/skills/image_concatenator/SKILL.md` | Completed | non-TS asset; no code-quality changes required |
| `src/utils/singleton.ts` | Completed | typed singleton instance storage (remove `any`) |
| `src/tools/usage/registries/tool_formatting_registry.ts` | Completed | typed singleton instance; no `any` instance access |
| `src/tools/usage/providers/tool_schema_provider.ts` | Completed | return type narrowed to `Record<string, unknown>` |
| `src/tools/utils.ts` | Completed | typed CATEGORY access (no `any`) |
| `src/multimedia/image/image_client_factory.ts` | Completed | typed singleton instance |
| `src/multimedia/audio/audio_client_factory.ts` | Completed | typed singleton instance |
| `src/agent/llm_response_processor/base_processor.ts` | Completed | camelCase lifecycle methods + `processResponse` |
| `src/agent/llm_response_processor/processor_definition.ts` | Completed | `processorClass` typing + camelCase errors |
| `src/agent/llm_response_processor/processor_registry.ts` | Completed | camelCase registry API + typed processor class |
| `src/agent/input_processor/base_user_input_processor.ts` | Completed | camelCase lifecycle methods |
| `src/agent/input_processor/processor_definition.ts` | Completed | `processorClass` typing + camelCase errors |
| `src/agent/input_processor/processor_registry.ts` | Completed | camelCase registry API + typed processor class |
| `src/agent/tool_invocation_preprocessor/base_preprocessor.ts` | Completed | camelCase lifecycle methods |
| `src/agent/tool_invocation_preprocessor/processor_definition.ts` | Completed | `processorClass` typing + camelCase errors |
| `src/agent/tool_invocation_preprocessor/processor_registry.ts` | Completed | camelCase registry API; removed legacy alias |
| `src/agent/tool_execution_result_processor/base_processor.ts` | Completed | camelCase lifecycle methods |
| `src/agent/tool_execution_result_processor/processor_definition.ts` | Completed | `processorClass` typing + camelCase errors |
| `src/agent/tool_execution_result_processor/processor_registry.ts` | Completed | camelCase registry API + typed processor class |
| `src/agent/lifecycle/base_processor.ts` | Completed | camelCase lifecycle methods |
| `src/agent/lifecycle/processor_definition.ts` | Completed | `processorClass` typing + camelCase errors |
| `src/agent/lifecycle/processor_registry.ts` | Completed | camelCase registry API + typed processor class |
| `src/agent/processor_option.ts` | Completed | `isMandatory` naming |
| `src/skills/registry.ts` | Completed | typed singleton instance |
| `src/tools/mcp/tool_registrar.ts` | Completed | typed config inputs + singleton instance |
| `src/tools/mcp/config_service.ts` | Completed | typed config dictionaries + safer error handling |
| `src/tools/mcp/server_instance_manager.ts` | Completed | typed singleton instance |
| `src/tools/search/factory.ts` | Completed | typed singleton instance |
| `src/agent/streaming/parser/xml_tool_parsing_state_registry.ts` | Completed | camelCase registry methods + typed state constructor |
| `src/agent/streaming/parser/states/xml_tag_initialization_state.ts` | Completed | updated registry API usage |
| `src/tools/mcp/types.ts` | Completed | camelCase instance key fields (`agentId`, `serverId`) |
| `src/tools/mcp/schema_mapper.ts` | Completed | tightened schema typing (unknown + guards) |
| `src/tools/mcp/server/base_managed_mcp_server.ts` | Completed | camelCase getters + tightened client/tool typing |
| `src/tools/mcp/server/stdio_managed_mcp_server.ts` | Completed | typed SDK transport/client; use configObject getter |
| `src/tools/mcp/server/http_managed_mcp_server.ts` | Completed | typed SDK transport/client; use configObject getter |
| `src/tools/mcp/server/websocket_managed_mcp_server.ts` | Completed | typed SDK transport/client; use configObject getter |
| `src/tools/mcp/server/proxy.ts` | Completed | camelCase error message + typed tool args |
| `tests/unit/tools/mcp/base_managed_mcp_server.test.ts` | Completed | updated for connectionState getter |
| `tests/unit/tools/mcp/proxy.test.ts` | Completed | updated error message expectation |
| `tests/unit/tools/mcp/types.test.ts` | Completed | updated McpServerInstanceKey fields |
| `examples/discover_status_transitions.ts` | Completed | camelCase AgentStatusDeriver context keys |
| `examples/shared/logging.ts` | Completed | no changes needed |
| `src/agent/bootstrap_steps/agent_bootstrapper.ts` | Completed | renamed bootstrapSteps |
| `src/agent/bootstrap_steps/base_bootstrap_step.ts` | Completed | no changes needed |
| `src/agent/context/index.ts` | Completed | no changes needed |
| `src/agent/events/agent_events.ts` | Completed | camelCase event fields + unknown typing |
| `src/agent/events/agent_input_event_queue_manager.ts` | Completed | camelCase queue names/methods; fixed internal event retrieval |
| `src/agent/factory/index.ts` | Completed | no changes needed |
| `src/agent/handlers/base_event_handler.ts` | Completed | no changes needed |
| `src/agent/input_processor/index.ts` | Completed | no changes needed |
| `src/agent/lifecycle/events.ts` | Completed | no changes needed |
| `src/agent/lifecycle/index.ts` | Completed | no changes needed |
| `src/agent/llm_response_processor/index.ts` | Completed | no changes needed |
| `src/agent/message/context_file_type.ts` | Completed | no changes needed |
| `src/agent/message/index.ts` | Completed | no changes needed |
| `src/agent/message/inter_agent_message.ts` | Completed | camelCase fields + updated dynamic type creation |
| `src/agent/message/inter_agent_message_type.ts` | Completed | camelCase `addType` helper |
| `src/agent/runtime/index.ts` | Completed | no changes needed |
| `src/agent/sender_type.ts` | Completed | no changes needed |
| `src/agent/shutdown_steps/base_shutdown_step.ts` | Completed | no changes needed |
| `src/agent/shutdown_steps/index.ts` | Completed | no changes needed |
| `src/agent/status/status_enum.ts` | Completed | no changes needed |
| `src/agent/streaming/adapters/invocation_adapter.ts` | Completed | camelCase segment fields + typed segment tracking |
| `src/agent/streaming/adapters/tool_call_parsing.ts` | Completed | camelCase parsing helpers + typed syntax registry access |
| `src/agent/streaming/adapters/tool_syntax_registry.ts` | Completed | camelCase tool syntax spec + typed registry |
| `src/agent/streaming/agent_event_stream.ts` | Completed | re-export only; no changes needed |
| `src/agent/streaming/api_tool_call/file_content_streamer.ts` | Completed | camelCase stream update fields |
| `src/agent/streaming/api_tool_call/json_string_field_extractor.ts` | Completed | reviewed; no changes needed |
| `src/agent/streaming/api_tool_call_streaming_response_handler.ts` | Completed | re-export only; no changes needed |
| `src/agent/streaming/events/stream_events.ts` | Completed | reviewed; payload keys remain snake_case |
| `src/agent/streaming/handlers/index.ts` | Completed | reviewed; no changes needed |
| `src/agent/streaming/index.ts` | Completed | removed snake_case alias export |
| `src/agent/streaming/parser/event_emitter.ts` | Completed | camelCase emission helpers + segment metadata typing |
| `src/agent/streaming/parser/events.ts` | Completed | re-export only; no changes needed |
| `src/agent/streaming/parser/index.ts` | Completed | camelCase parser API exports |
| `src/agent/streaming/parser/invocation_adapter.ts` | Completed | re-export only; no changes needed |
| `src/agent/streaming/parser/json_parsing_strategies/base.ts` | Completed | camelCase strategy interface methods |
| `src/agent/streaming/parser/json_parsing_strategies/default.ts` | Completed | camelCase JSON parsing helpers |
| `src/agent/streaming/parser/json_parsing_strategies/gemini.ts` | Completed | camelCase JSON parsing helpers |
| `src/agent/streaming/parser/json_parsing_strategies/index.ts` | Completed | reviewed; exports only |
| `src/agent/streaming/parser/json_parsing_strategies/openai.ts` | Completed | camelCase JSON parsing helpers |
| `src/agent/streaming/parser/json_parsing_strategies/registry.ts` | Completed | camelCase profiles + typed pattern registry |
| `src/agent/streaming/parser/parser_context.ts` | Completed | camelCase config/state accessors |
| `src/agent/streaming/parser/parser_factory.ts` | Completed | camelCase config options + parser name resolution |
| `src/agent/streaming/parser/sentinel_format.ts` | Completed | reviewed; constants only |
| `src/agent/streaming/parser/state_factory.ts` | Completed | camelCase state factory methods |
| `src/agent/streaming/parser/states/base_state.ts` | Completed | reviewed; no changes needed |
| `src/agent/streaming/parser/states/custom_xml_tag_run_bash_parsing_state.ts` | Completed | camelCase hook names |
| `src/agent/streaming/parser/states/custom_xml_tag_write_file_parsing_state.ts` | Completed | camelCase hook names |
| `src/agent/streaming/parser/states/delimited_content_state.ts` | Completed | camelCase hook names |
| `src/agent/streaming/parser/states/json_initialization_state.ts` | Completed | camelCase signature checker |
| `src/agent/streaming/parser/states/json_tool_parsing_state.ts` | Completed | reviewed; no changes needed |
| `src/agent/streaming/parser/states/sentinel_content_state.ts` | Completed | camelCase hook names |
| `src/agent/streaming/parser/states/sentinel_initialization_state.ts` | Completed | reviewed; no changes needed |
| `src/agent/streaming/parser/states/text_state.ts` | Completed | reviewed; no changes needed |
| `src/agent/streaming/parser/states/xml_patch_file_tool_parsing_state.ts` | Completed | camelCase hook names |
| `src/agent/streaming/parser/states/xml_run_bash_tool_parsing_state.ts` | Completed | camelCase hook names |
| `src/agent/streaming/parser/states/xml_tool_parsing_state.ts` | Completed | camelCase hook names |
| `src/agent/streaming/parser/states/xml_write_file_tool_parsing_state.ts` | Completed | camelCase hook names |
| `src/agent/streaming/parser/strategies/registry.ts` | Completed | camelCase strategy builder; retained registry keys |
| `src/agent/streaming/parser/stream_scanner.ts` | Completed | reviewed; no changes needed |
| `src/agent/streaming/parser/streaming_parser.ts` | Completed | camelCase segment metadata fields |
| `src/agent/streaming/parser/tool_constants.ts` | Completed | reviewed; constants only |
| `src/agent/streaming/parsing_streaming_response_handler.ts` | Completed | camelCase parser config + getter fix |
| `src/agent/streaming/queue_streamer.ts` | Completed | re-export only; no changes needed |
| `src/agent/streaming/segments/segment_events.ts` | Completed | reviewed; payload keys remain snake_case |
| `src/agent/streaming/stream_event_payloads.ts` | Completed | reviewed; payload keys remain snake_case |
| `src/agent/streaming/stream_events.ts` | Completed | reviewed; payload keys remain snake_case |
| `src/agent/streaming/utils/queue_streamer.ts` | Completed | camelCase stream helper names |
| `src/agent/system_prompt_processor/index.ts` | Completed | no changes needed |
| `src/agent/tool_execution_result_processor/index.ts` | Completed | no changes needed |
| `src/agent/tool_invocation_preprocessor/index.ts` | Completed | no changes needed |
| `src/agent/workspace/index.ts` | Completed | no changes needed |
| `src/agent/workspace/workspace_config.ts` | Completed | no changes needed |
| `src/agent_team/bootstrap_steps/base_agent_team_bootstrap_step.ts` | Completed | no changes needed |
| `src/agent_team/context/index.ts` | Completed | no changes needed |
| `src/agent_team/events/agent_team_events.ts` | Completed | camelCase event fields |
| `src/agent_team/events/agent_team_input_event_queue_manager.ts` | Completed | camelCase queue names/methods; typed internal events |
| `src/agent_team/factory/index.ts` | Completed | no changes needed |
| `src/agent_team/handlers/base_agent_team_event_handler.ts` | Completed | typed AgentTeamContext in handler base |
| `src/agent_team/runtime/index.ts` | Completed | no changes needed |
| `src/agent_team/shutdown_steps/base_agent_team_shutdown_step.ts` | Completed | no changes needed |
| `src/agent_team/status/agent_team_status.ts` | Completed | renamed `isTerminal` helper |
| `src/agent_team/streaming/agent_team_stream_event_payloads.ts` | Completed | tightened payload typing to `unknown` while preserving snake_case payload keys |
| `src/agent_team/streaming/agent_team_stream_events.ts` | Completed | camelCase local variable naming + fixed task-plan payload check; preserved snake_case event fields |
| `src/cli/agent/cli_display.ts` | Completed | tightened payload typing; preserved snake_case event keys |
| `src/cli/agent_team/widgets/agent_list_sidebar.tsx` | Completed | reviewed; no changes needed |
| `src/cli/agent_team/widgets/focus_pane.tsx` | Completed | reviewed; no changes needed |
| `src/cli/agent_team/widgets/index.ts` | Completed | reviewed; no changes needed |
| `src/cli/agent_team/widgets/logo.tsx` | Completed | reviewed; no changes needed |
| `src/cli/agent_team/widgets/renderables.ts` | Completed | reviewed; no changes needed |
| `src/cli/agent_team/widgets/shared.ts` | Completed | reviewed; no changes needed |
| `src/cli/agent_team/widgets/status_bar.tsx` | Completed | reviewed; no changes needed |
| `src/cli/agent_team/widgets/task_plan_panel.tsx` | Completed | reviewed; no changes needed |
| `src/cli/index.ts` | Completed | camelCase CLI exports (`runAgentCli`, `runAgentTeamCli`) |
| `src/clients/autobyteus_client.ts` | Completed | camelCase parameter naming + `unknown` typing for payloads |
| `src/clients/cert_utils.ts` | Completed | reviewed; no changes needed |
| `src/clients/index.ts` | Completed | reviewed; no changes needed |
| `src/events/event_manager.ts` | Completed | camelCase topics/subscriptions + `unknown` metadata typing |
| `src/events/event_types.ts` | Completed | reviewed; enum values remain snake_case |
| `src/llm/api/anthropic_llm.ts` | Completed | reviewed; no naming changes needed |
| `src/llm/api/autobyteus_llm.ts` | Completed | hostUrl rename + LLMModel camelCase usage |
| `src/llm/api/deepseek_llm.ts` | Completed | camelCase LLMModel option keys |
| `src/llm/api/gemini_llm.ts` | Completed | camelCase LLMModel option keys |
| `src/llm/api/grok_llm.ts` | Completed | camelCase LLMModel option keys |
| `src/llm/api/kimi_llm.ts` | Completed | camelCase LLMModel option keys |
| `src/llm/api/lmstudio_llm.ts` | Completed | hostUrl rename for LM Studio client |
| `src/llm/api/minimax_llm.ts` | Completed | camelCase LLMModel option keys |
| `src/llm/api/mistral_llm.ts` | Completed | camelCase LLMModel option keys |
| `src/llm/api/ollama_llm.ts` | Completed | hostUrl rename for Ollama client |
| `src/llm/api/openai_compatible_llm.ts` | Completed | defaultConfig merge on construction |
| `src/llm/api/openai_llm.ts` | Completed | reviewed; no naming changes needed |
| `src/llm/api/openai_responses_llm.ts` | Completed | defaultConfig merge on construction |
| `src/llm/api/qwen_llm.ts` | Completed | camelCase LLMModel option keys |
| `src/llm/api/zhipu_llm.ts` | Completed | camelCase LLMModel option keys |
| `src/llm/autobyteus_provider.ts` | Completed | camelCase LLMModel options + tighter typing |
| `src/llm/base.ts` | Completed | kwargs typed as Record<string, unknown> |
| `src/llm/converters/anthropic_tool_call_converter.ts` | Completed | reduced any usage with type guards |
| `src/llm/converters/gemini_tool_call_converter.ts` | Completed | reduced any usage with type guards |
| `src/llm/converters/mistral_tool_call_converter.ts` | Completed | reduced any usage with type guards |
| `src/llm/converters/openai_tool_call_converter.ts` | Completed | reviewed; no changes needed |
| `src/llm/extensions/base_extension.ts` | Completed | kwargs typed as Record<string, unknown> |
| `src/llm/extensions/extension_registry.ts` | Completed | typed constructor args as unknown[] |
| `src/llm/extensions/token_usage_tracking_extension.ts` | Completed | removed any casts; typed kwargs |
| `src/llm/llm_factory.ts` | Completed | camelCase LLMModel options + modelIdentifier usage |
| `src/llm/lmstudio_provider.ts` | Completed | camelCase LLMModel options + pricingConfig |
| `src/llm/models.ts` | Completed | camelCase model identifier internals |
| `src/llm/ollama_provider.ts` | Completed | camelCase LLMModel options + pricingConfig |
| `src/llm/ollama_provider_resolver.ts` | Completed | reviewed; no changes needed |
| `src/llm/providers.ts` | Completed | reviewed; no changes needed |
| `src/llm/runtimes.ts` | Completed | reviewed; no changes needed |
| `src/llm/token_counter/base_token_counter.ts` | Completed | reviewed; no changes needed |
| `src/llm/user_message.ts` | Completed | reviewed; snake_case fields retained for API contract |
| `src/llm/utils/llm_config.ts` | Completed | camelCase config fields + snake_case serialization |
| `src/llm/utils/media_payload_formatter.ts` | Completed | reviewed; no naming changes needed |
| `src/llm/utils/messages.ts` | Completed | reviewed; snake_case fields retained for API contract |
| `src/llm/utils/response_types.ts` | Completed | reviewed; snake_case fields retained for API contract |
| `src/llm/utils/token_usage.ts` | Completed | reviewed; snake_case fields retained for API contract |
| `src/llm/utils/token_usage_tracker.ts` | Completed | camelCase defaultConfig/pricingConfig usage |
| `src/llm/utils/tool_call_delta.ts` | Completed | reviewed; snake_case fields retained for API contract |
| `src/multimedia/audio/api/autobyteus_audio_client.ts` | Completed | typed model/config + generationConfig as unknown |
| `src/multimedia/audio/api/gemini_audio_client.ts` | Completed | typed Gemini client/config; reduced any usage |
| `src/multimedia/audio/api/index.ts` | Completed | reviewed; no changes needed |
| `src/multimedia/audio/api/openai_audio_client.ts` | Completed | typed model/config + config guards |
| `src/multimedia/audio/audio_model.ts` | Completed | ParameterSchemaInput/defaultParams now use unknown |
| `src/multimedia/audio/autobyteus_audio_provider.ts` | Completed | typed server response handling |
| `src/multimedia/audio/base_audio_client.ts` | Completed | generationConfig/rest args typed as unknown |
| `src/multimedia/audio/index.ts` | Completed | reviewed; no changes needed |
| `src/multimedia/image/api/autobyteus_image_client.ts` | Completed | typed model/config + generationConfig as unknown |
| `src/multimedia/image/api/gemini_image_client.ts` | Completed | typed Gemini client/config; reduced any usage |
| `src/multimedia/image/api/index.ts` | Completed | reviewed; no changes needed |
| `src/multimedia/image/api/openai_image_client.ts` | Completed | typed model/config + config guards |
| `src/multimedia/image/autobyteus_image_provider.ts` | Completed | typed server response handling |
| `src/multimedia/image/base_image_client.ts` | Completed | generationConfig/rest args typed as unknown |
| `src/multimedia/image/image_model.ts` | Completed | ParameterSchemaInput/defaultParams now use unknown |
| `src/multimedia/image/index.ts` | Completed | reviewed; no changes needed |
| `src/multimedia/index.ts` | Completed | reviewed; no changes needed |
| `src/multimedia/providers.ts` | Completed | reviewed; no changes needed |
| `src/multimedia/runtimes.ts` | Completed | reviewed; no changes needed |
| `src/multimedia/utils/api_utils.ts` | Completed | reviewed; no changes needed |
| `src/multimedia/utils/index.ts` | Completed | reviewed; no changes needed |
| `src/multimedia/utils/multimedia_config.ts` | Completed | params typed as Record<string, unknown> |
| `src/multimedia/utils/response_types.ts` | Completed | reviewed; snake_case fields retained for API contract |
| `src/prompt/index.ts` | Completed | reviewed; no changes needed |
| `src/prompt/prompt_builder.ts` | Completed | reviewed; no changes needed |
| `src/skills/loader.ts` | Completed | typed error handling in SKILL.md load |
| `src/skills/model.ts` | Completed | reviewed; no changes needed |
| `src/task_management/converters/index.ts` | Completed | reviewed; no changes needed |
| `src/task_management/deliverable.ts` | Completed | reviewed; snake_case schema retained for API contract |
| `src/task_management/deliverables/file_deliverable.ts` | Completed | reviewed; no changes needed |
| `src/task_management/deliverables/index.ts` | Completed | reviewed; no changes needed |
| `src/task_management/events.ts` | Completed | reviewed; snake_case schema retained for API contract |
| `src/task_management/index.ts` | Completed | reviewed; no changes needed |
| `src/task_management/schemas/deliverable_schema.ts` | Completed | reviewed; snake_case schema retained for API contract |
| `src/task_management/schemas/index.ts` | Completed | reviewed; no changes needed |
| `src/task_management/schemas/task_definition.ts` | Completed | reviewed; snake_case schema retained for API contract |
| `src/task_management/schemas/task_status_report.ts` | Completed | reviewed; snake_case schema retained for API contract |
| `src/task_management/schemas/todo_definition.ts` | Completed | reviewed; snake_case schema retained for API contract |
| `src/task_management/todo.ts` | Completed | reviewed; snake_case fields retained for API contract |
| `src/task_management/tools/index.ts` | Completed | reviewed; no changes needed |
| `src/task_management/tools/task_tools/index.ts` | Completed | reviewed; no changes needed |
| `src/task_management/tools/todo_tools/index.ts` | Completed | reviewed; no changes needed |
| `src/tools/factory/tool_factory.ts` | Completed | reviewed; no changes needed |
| `src/tools/mcp/index.ts` | Completed | reviewed; no changes needed |
| `src/tools/mcp/server/index.ts` | Completed | reviewed; no changes needed |
| `src/tools/multimedia/index.ts` | Completed | reviewed; no changes needed |
| `src/tools/search/client.ts` | Completed | strategy marked readonly |
| `src/tools/search/providers.ts` | Completed | reviewed; no changes needed |
| `src/tools/skill/load_skill.ts` | Completed | typed context/error handling; retained snake_case tool arg |
| `src/tools/tool_category.ts` | Completed | reviewed; no changes needed |
| `src/tools/tool_origin.ts` | Completed | reviewed; no changes needed |
| `src/tools/usage/formatters/anthropic_json_example_formatter.ts` | Completed | reviewed; no changes needed |
| `src/tools/usage/formatters/patch_file_xml_example_formatter.ts` | Completed | reviewed; no changes needed |
| `src/tools/usage/formatters/patch_file_xml_schema_formatter.ts` | Completed | reviewed; no changes needed |
| `src/tools/usage/formatters/run_bash_xml_example_formatter.ts` | Completed | reviewed; no changes needed |
| `src/tools/usage/formatters/run_bash_xml_schema_formatter.ts` | Completed | reviewed; no changes needed |
| `src/tools/usage/formatters/write_file_xml_example_formatter.ts` | Completed | reviewed; no changes needed |
| `src/tools/usage/formatters/write_file_xml_schema_formatter.ts` | Completed | reviewed; no changes needed |
| `src/tools/usage/providers/tool_manifest_provider.ts` | Completed | reviewed; no changes needed |
| `src/tools/usage/registries/tool_formatter_pair.ts` | Completed | reviewed; no changes needed |
| `src/utils/diff_utils.ts` | Completed | reviewed; no changes needed |
| `src/utils/download_utils.ts` | Completed | reviewed; no changes needed |
| `src/utils/dynamic_enum.ts` | Completed | tightened registry/value typing (unknown vs any) |
| `src/utils/file_utils.ts` | Completed | reviewed; no changes needed |
| `src/utils/gemini_helper.ts` | Completed | reviewed; no changes needed |
| `src/utils/gemini_model_mapping.ts` | Completed | reviewed; no changes needed |
| `src/utils/html_cleaner.ts` | Completed | reduced any usage; typed cheerio node access |
| `src/utils/llm_output_formatter.ts` | Completed | switched any to unknown + guards |
| `src/utils/logger.ts` | Completed | typed logger marker storage |
| `src/utils/parameter_schema.ts` | Completed | centralized schema normalization helpers |
| `src/utils/tool_call_format.ts` | Completed | reviewed; no changes needed |
