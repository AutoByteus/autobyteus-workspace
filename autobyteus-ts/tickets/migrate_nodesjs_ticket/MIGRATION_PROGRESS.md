# Migration Progress Record

This document tracks the migration of files from Python to Node.js.

## Legend

- **Status**: `Pending`, `In Progress`, `Completed`, `Skipped`
- **Test Status**: `Pending`, `In Progress`, `Created`, `Deferred`, `N/A`
- **Note:** Test Status tracks whether the TS test file was migrated/created; actual executions are tracked in the Unit Run / Integration Run columns and the Progress Log.

## Progress Log
- 2026-01-29: Ran `pnpm --dir autobyteus-ts exec vitest --run tests/unit/cli/agent_team_focus_pane_history.test.ts tests/unit/cli/agent_team_state_store.test.ts` (passed).
- 2026-01-29: Ran `pnpm exec vitest --run tests/unit/cli/agent_team_focus_pane_history.test.ts` (passed).
- 2026-01-29: Ran `pnpm exec vitest --run tests/unit/utils/logger.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/integration/agent/tool_approval_flow.test.ts` (passed; includes run_bash approval).
- 2026-01-28: Ran `pnpm exec vitest --run tests/integration/agent/tool_approval_flow.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/cli/agent_team_state_store.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/cli/agent_team_focus_pane_history.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/cli/agent_team_renderables.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/cli/agent_team_state_store.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/cli/cli_display.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/agent/streaming/segments/segment_events.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/integration/agent_team/streaming/agent_team_streaming_flow.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/integration/agent_team/streaming/agent_team_subteam_streaming_flow.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/integration/events/event_bus.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/integration/events/event_bus.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/integration/agent_team/agent_team_single_flow.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/integration/llm/llm_reloading.test.ts` (timed out after 10s; requires live LM Studio/Ollama/Autobyteus servers).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/llm/converters/openai_tool_call_converter.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/skills/model.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/agent/streaming/adapters/tool_call_parsing.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/agent/streaming/reexports.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/agent/streaming/segments/segment_events.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/agent/lifecycle/base_processor.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/agent/lifecycle/lifecycle_events.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/multimedia/image/image_client_factory.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/multimedia/audio/audio_client_factory.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/multimedia/image/api/autobyteus_image_client.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/multimedia/image/api/gemini_image_client.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/multimedia/image/api/openai_image_client.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/multimedia/audio/api/autobyteus_audio_client.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/multimedia/audio/api/gemini_audio_client.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/multimedia/audio/api/openai_audio_client.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/multimedia/image/image_model.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/multimedia/audio/audio_model.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/multimedia/utils/api_utils.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/multimedia/utils/multimedia_config.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/multimedia/utils/response_types.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/multimedia/runtimes.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/multimedia/providers.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/tools/skill/load_skill.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/skills/registry.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/skills/loader.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/task_management/tools/todo_tools/update_todo_status.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/task_management/tools/todo_tools/get_todo_list.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/task_management/tools/todo_tools/add_todo.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/task_management/tools/todo_tools/create_todo_list.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/task_management/tools/task_tools/assign_task_to.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/task_management/tools/task_tools/get_my_tasks.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/task_management/tools/task_tools/get_task_plan_status.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/task_management/tools/task_tools/update_task_status.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/task_management/tools/task_tools/create_task.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/task_management/tools/task_tools/create_tasks.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/task_management/todo_list.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/task_management/todo.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/task_management/events.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/task_management/converters/task_plan_converter.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/task_management/in_memory_task_plan.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/task_management/base_task_plan.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/task_management/task.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/task_management/deliverable.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/task_management/schemas/task_status_report.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/task_management/schemas/deliverable_schema.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/task_management/schemas/todo_definition.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/task_management/schemas/task_definition.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/invocation_adapter.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/xml_tag_initialization_state.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/text_state.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/sentinel_parsing_state.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/json_parsing_states.test.ts` (passed).
- 2026-01-28: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/json_parsing_strategies.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/events/agent_team_events.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/events/event_emitter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/events/event_manager.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/events/event_types.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/clients/cert_utils.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/clients/autobyteus_client.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/prompt/prompt_builder.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/prompt/prompt_template.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/utils/llm_output_formatter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/utils/gemini_model_mapping.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/utils/gemini_helper.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/utils/download_utils.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/utils/html_cleaner.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/utils/parameter_schema.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/utils/diff_utils_fuzzy.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/utils/dynamic_enum.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/utils/file_utils.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/utils/tool_call_format.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/utils/singleton.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/llm/api/anthropic_llm.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/llm/api/openai_llm.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/llm/api/openai_compatible_llm.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/llm/converters_media.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/llm/converters/anthropic_tool_call_converter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/llm/user_message.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/llm/base.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/llm/enums.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/llm/models.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/llm/extensions/token_usage_tracking_extension.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/llm/extensions/extension_registry.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/llm/extensions/base_extension.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/llm/token_counter/base_token_counter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/llm/utils/media_payload_formatter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/llm/utils/token_usage_tracker.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/llm/utils/llm_config.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/llm/utils/response_types.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/llm/utils/tool_call_delta.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/llm/utils/token_usage.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/llm/utils/messages.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/agent.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/factory/agent_factory.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/lifecycle/lifecycle_events.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/lifecycle/processor_registry.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/lifecycle/base_processor.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/handlers/streaming_handler_factory.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/handlers/pass_through_streaming_response_handler.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/handlers/parsing_streaming_response_handler.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/handlers/api_tool_call_streaming_response_handler.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/api_tool_call/file_content_streamer.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/api_tool_call/json_string_field_extractor.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/states/xml_write_file_tool_parsing_state.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/states/xml_patch_file_tool_parsing_state.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/states/xml_run_bash_tool_parsing_state.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/states/xml_tool_parsing_state.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/states/custom_xml_tag_run_bash_parsing_state.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/states/custom_xml_tag_write_file_parsing_state.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/xml_tool_parsing_state_registry.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/xml_tag_initialization_state.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/sentinel_parsing_state.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/text_state.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/events.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/event_emitter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/stream_scanner.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/json_parsing_states.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/json_parsing_strategies.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/invocation_adapter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/parser_context.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/state_factory.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/parser_factory.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/parser/streaming_parser.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/events/stream_events.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/events/stream_event_payloads.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/streams/agent_event_stream.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/streaming/utils/queue_streamer.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/bootstrap_steps/agent_bootstrapper.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/runtime/agent_worker.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/runtime/agent_runtime.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/handlers/base_event_handler.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/handlers/event_handler_registry.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/handlers/generic_event_handler.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/handlers/user_input_message_event_handler.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/handlers/lifecycle_event_logger.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/handlers/approved_tool_invocation_event_handler.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/handlers/tool_result_event_handler.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/handlers/tool_execution_approval_event_handler.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/handlers/tool_invocation_request_event_handler.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/handlers/llm_complete_response_received_event_handler.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/handlers/llm_user_message_ready_event_handler.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/handlers/inter_agent_message_event_handler.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/handlers/bootstrap_event_handler.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/events/agent_events.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/events/event_store.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/events/agent_input_event_queue_manager.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/events/worker_event_dispatcher.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/events/notifiers.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/shutdown_steps/llm_instance_cleanup_step.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/shutdown_steps/mcp_server_cleanup_step.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/shutdown_steps/tool_cleanup_step.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/status/status_enum.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/message/context_file_type.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/message/context_file.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/sender_type.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/message/agent_input_user_message.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/message/inter_agent_message_type.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/message/inter_agent_message.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/message/multimodal_message_builder.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/exceptions.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/processor_option.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/tool_invocation.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/workspace/base_workspace.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/context/agent_runtime_state.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/context/agent_config.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/context/agent_context_registry.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/context/agent_context.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/input_processor/base_user_input_processor.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/input_processor/processor_definition.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/input_processor/processor_registry.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/tool_invocation_preprocessor/base_preprocessor.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/tool_invocation_preprocessor/processor_definition.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/tool_invocation_preprocessor/processor_registry.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/tool_execution_result_processor/base_processor.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/tool_execution_result_processor/processor_definition.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/tool_execution_result_processor/processor_registry.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/llm_response_processor/base_processor.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/llm_response_processor/processor_definition.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/llm_response_processor/processor_registry.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/system_prompt_processor/base_processor.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/system_prompt_processor/processor_definition.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/system_prompt_processor/processor_registry.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/system_prompt_processor/tool_manifest_injector_processor.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/system_prompt_processor/available_skills_processor.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/system_prompt_processor/register_system_prompt_processors.test.ts` (passed).
- 2026-01-27: Ran `pnpm vitest tests/integration/tools/multimedia/image_tools.test.ts` (failed: Gemini RESOURCE_EXHAUSTED 429 on reference-image + edit tests).
- 2026-01-27: Ran `pnpm vitest tests/integration/tools/multimedia/audio_tools.test.ts` (passed; 1 skipped).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/shutdown_steps/bridge_cleanup_step.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/shutdown_steps/sub_team_shutdown_step.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/shutdown_steps/agent_team_shutdown_step.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/shutdown_steps/agent_team_shutdown_orchestrator.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/runtime/agent_team_worker.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/runtime/agent_team_runtime.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/agent_team.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/context/team_manager.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/factory/agent_team_factory.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/agent_team_builder.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/task_notification/task_notification_mode.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/message/send_message_to.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/workspace/workspace_config.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/status/status_deriver.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/status/status_manager.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/status/status_update_utils.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent/shutdown_steps/agent_shutdown_orchestrator.test.ts` (passed).
- 2026-01-27: Ran `pnpm vitest tests/unit/tools/mcp/http_managed_mcp_server.test.ts` (passed).
- 2026-01-27: Ran `pnpm vitest tests/unit/tools/mcp/websocket_managed_mcp_server.test.ts` (passed).
- 2026-01-27: Ran tools unit/integration tests in `tests/unit/tools` and `tests/integration/tools` one-by-one (all passed except image_tools integration).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/mcp/stdio_managed_mcp_server.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/mcp/http_managed_mcp_server.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/mcp/websocket_managed_mcp_server.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/mcp/tool_registrar.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/tool_config.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/tool_state.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/tool_category.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/tool_origin.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/base_tool.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/functional_tool.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/utils.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/registry/tool_definition.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/registry/tool_registry.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/factory/tool_factory.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/file/read_file.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/file/write_file.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/file/patch_file.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/web/read_url_tool.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/multimedia/media_reader_tool.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/multimedia/download_media_tool.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/usage/formatters/default_json_schema_formatter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/usage/formatters/default_json_example_formatter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/usage/formatters/default_xml_schema_formatter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/usage/formatters/default_xml_example_formatter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/usage/formatters/write_file_xml_formatter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/usage/formatters/patch_file_xml_formatter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/usage/formatters/run_bash_xml_formatter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/usage/formatters/openai_json_schema_formatter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/usage/formatters/openai_json_example_formatter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/usage/formatters/anthropic_json_schema_formatter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/usage/formatters/anthropic_json_example_formatter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/usage/formatters/gemini_json_schema_formatter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/usage/formatters/gemini_json_example_formatter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/usage/formatters/google_json_schema_formatter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/usage/formatters/google_json_example_formatter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/usage/formatters/mistral_json_schema_formatter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/usage/providers/tool_schema_provider.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/usage/providers/tool_manifest_provider.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/usage/registries/tool_formatting_registry.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/search/providers.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/search/client.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/search/factory.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/search/serper_strategy.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/search/serpapi_strategy.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/search/google_cse_strategy.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/search_tool.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/skills/registry.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/skills/loader.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/skill/load_skill.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/agent/agent_skills.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/utils/file_utils.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/utils/dynamic_enum.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/utils/tool_call_format.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/utils/diff_utils.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/utils/singleton.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/utils/parameter_schema.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/utils/html_cleaner.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/utils/messages.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/utils/token_usage.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/utils/token_usage_tracker.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/utils/response_types.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/utils/llm_config.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/utils/tool_call_delta.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/utils/media_payload_formatter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/base.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/user_message.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/models.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/enums.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/extensions/base_extension.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/extensions/extension_registry.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/extensions/token_usage_tracking_extension.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/converters/openai_tool_call_converter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/converters/anthropic_tool_call_converter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/token_counter/base_token_counter.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/openai_compatible_llm.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/openai_llm.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/anthropic_llm.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/multimedia/image/api/gemini_image_client.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/multimedia/image/api/openai_image_client.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/multimedia/image/api/autobyteus_image_client.test.ts` (skipped).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/multimedia/image/autobyteus_image_provider.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/multimedia/audio/api/gemini_audio_client.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/multimedia/audio/api/openai_audio_client.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/multimedia/audio/api/autobyteus_audio_client.test.ts` (skipped).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/multimedia/audio/autobyteus_audio_provider.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/tool_meta.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/terminal/pty_session.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/terminal/terminal_session_manager.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/terminal/background_process_manager.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/terminal/terminal_tools.test.ts` (passed).

- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/multimedia/image_tools.test.ts -t "generates an image"` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/tools/multimedia/audio_tools.test.ts -t "generates single-speaker audio"` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/agent/handlers/api_tool_call_handler_live.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/agent/handlers/claude_tool_call_handler_live.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/agent/streaming/parser/streaming_parser.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/agent/streaming/json_tool_styles_integration.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/agent/streaming/full_streaming_flow.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/agent/runtime/agent_runtime.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/agent/handlers/mistral_tool_call_handler_live.test.ts` (passed).
- 2026-01-27: Ran `pnpm vitest tests/integration/agent/handlers/gemini_tool_call_handler_live.test.ts` (passed).
- 2026-01-27: Ran `pnpm vitest tests/integration/agent/handlers/api_tool_call_handler_live.test.ts` (passed).
- 2026-01-27: Ran `pnpm vitest tests/integration/agent/handlers/claude_tool_call_handler_live.test.ts` (passed).
- 2026-01-27: Ran `pnpm vitest tests/integration/agent/handlers/gemini_tool_call_handler_live.test.ts` (passed).
- 2026-01-27: Ran `pnpm vitest tests/integration/agent/handlers/mistral_tool_call_handler_live.test.ts` (passed).
- 2026-01-27: Ran `pnpm vitest tests/integration/agent/agent_single_flow.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/agent/agent_single_flow.test.ts` (passed; OpenAI LLM, AUTOBYTEUS_STREAM_PARSER=api_tool_call).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/agent/agent_single_flow_xml.test.ts` (passed; OpenAI LLM, AUTOBYTEUS_STREAM_PARSER=xml).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/agent/agent_dual_flow.test.ts` (passed; OpenAI LLM, AUTOBYTEUS_STREAM_PARSER=api_tool_call).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/handlers/agent_team_event_handler_registry.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/status/status_deriver.test.ts` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_gemini_llm.py -q -k test_gemini_llm_response` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/gemini_llm.test.ts -t "should successfully make a simple completion call"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_gemini_llm.py -q -k test_gemini_llm_streaming` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/gemini_llm.test.ts -t "should stream response incrementally"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_gemini_llm.py -q -k test_gemini_send_user_message` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/gemini_llm.test.ts -t "should support public sendUserMessage"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_gemini_llm.py -q -k test_gemini_stream_user_message` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/gemini_llm.test.ts -t "should support public streamUserMessage"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_gemini_llm.py -q -k test_gemini_multimodal_image` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/gemini_llm.test.ts -t "should handle multimodal image input"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_gemini_llm.py -q -k test_gemini_multimodal_audio` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/gemini_llm.test.ts -t "should handle multimodal audio input"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_gemini_llm.py -q -k test_gemini_multimodal_video` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/gemini_llm.test.ts -t "should handle multimodal video input"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_gemini_llm.py -q -k test_gemini_llm_tool_calls` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/gemini_llm.test.ts -t "should generate tool calls in the stream"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_claude_llm.py -q -k test_claude_llm_response` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/anthropic_llm.test.ts -t "should successfully make a simple completion call"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_claude_llm.py -q -k test_claude_llm_streaming` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/anthropic_llm.test.ts -t "should stream response incrementally"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_claude_llm.py -q -k test_send_user_message` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/anthropic_llm.test.ts -t "should support public sendUserMessage"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_claude_llm.py -q -k test_stream_user_message` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/anthropic_llm.test.ts -t "should support public streamUserMessage"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_claude_llm_image.py -q -k "test_claude_llm_with_image and not base64"` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/anthropic_llm_image.test.ts -t "should send a single local image file"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_claude_llm_image.py -q -k test_claude_llm_with_image_base64` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/anthropic_llm_image.test.ts -t "should send a single image via base64"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_claude_llm_image.py -q -k test_claude_llm_with_multiple_images` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/anthropic_llm_image.test.ts -t "should send multiple local images"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_claude_llm_image.py -q -k test_claude_llm_streaming_with_image` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/anthropic_llm_image.test.ts -t "should stream with a single local image file"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_claude_llm_image.py -q -k test_claude_llm_unsupported_mime_type` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/anthropic_llm_image.test.ts -t "should tolerate unsupported MIME types and still respond"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_openai_llm.py -q -k test_openai_llm_response` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/openai_llm.test.ts -t "should successfully make a simple completion call"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_openai_llm.py -q -k test_openai_llm_multimodal_response` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/openai_llm.test.ts -t "should handle a multimodal image response"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_openai_llm.py -q -k test_openai_llm_streaming` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/openai_llm.test.ts -t "should stream response incrementally"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_openai_llm.py -q -k test_send_user_message` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/openai_llm.test.ts -t "should support public sendUserMessage"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_openai_llm.py -q -k test_stream_user_message` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/openai_llm.test.ts -t "should support public streamUserMessage"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_openai_llm.py -q -k test_openai_tool_calls` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/openai_llm.test.ts -t "should handle tool calls streaming"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_openai_llm_image.py -q -k test_openai_llm_with_image` (passed; also matched `test_openai_llm_with_image_base64`).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/openai_llm_image.test.ts -t "should send a single local image file"` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/openai_llm_image.test.ts -t "should send a single image via base64"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_openai_llm_image.py -q -k test_openai_llm_with_multiple_images` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/openai_llm_image.test.ts -t "should send multiple local images"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_openai_llm_image.py -q -k test_openai_llm_streaming_with_image` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/openai_llm_image.test.ts -t "should stream with a single local image file"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_openai_llm_image.py -q -k test_openai_llm_with_invalid_image_path` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/openai_llm_image.test.ts -t "should handle invalid image paths gracefully"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_openai_llm_image.py -q -k test_cleanup` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/openai_llm_image.test.ts -t "should clear messages on cleanup"` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/mistral_llm.test.ts -t "should handle multimodal image input"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_mistral_llm.py -q -k test_mistral_llm_response` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/mistral_llm.test.ts -t "should successfully make a simple completion call"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_mistral_llm.py -q -k test_mistral_llm_streaming` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/mistral_llm.test.ts -t "should stream response incrementally"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_mistral_llm.py -q -k test_send_user_message` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/mistral_llm.test.ts -t "should support public sendUserMessage"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_mistral_llm.py -q -k test_stream_user_message` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/mistral_llm.test.ts -t "should support public streamUserMessage"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_deepseek_llm.py -q -k test_deepseek_llm_response` (failed: 401 invalid DEEPSEEK_API_KEY).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_deepseek_llm.py -q -k test_deepseek_llm_response` (failed: 401 invalid DEEPSEEK_API_KEY).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_deepseek_llm.py -q -k test_deepseek_llm_response` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/deepseek_llm.test.ts -t "should successfully make a simple completion call"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_deepseek_llm.py -q -k test_deepseek_llm_streaming` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/deepseek_llm.test.ts -t "should stream response incrementally"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_deepseek_llm.py -q -k test_send_user_message` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/deepseek_llm.test.ts -t "should support public sendUserMessage"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_deepseek_llm.py -q -k test_stream_user_message` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/deepseek_llm.test.ts -t "should support public streamUserMessage"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_grok_llm.py -q -k test_grok_llm_response` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/grok_llm.test.ts -t "should successfully make a simple completion call"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_grok_llm.py -q -k test_grok_llm_streaming` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/grok_llm.test.ts -t "should stream response incrementally"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_kimi_llm.py -q -k test_kimi_llm_response` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/kimi_llm.test.ts -t "should successfully make a simple completion call"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_kimi_llm.py -q -k test_kimi_llm_streaming` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/kimi_llm.test.ts -t "should stream response incrementally"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_kimi_llm.py -q -k test_send_user_message` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/kimi_llm.test.ts -t "should support public sendUserMessage"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_kimi_llm.py -q -k test_stream_user_message` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/kimi_llm.test.ts -t "should support public streamUserMessage"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_qwen_llm.py -q -k test_qwen_llm_response` (skipped: missing DASHSCOPE_API_KEY).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/llm_reloading.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/lmstudio_llm.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/ollama_llm.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/autobyteus_llm.test.ts` (passed; forced model via AUTOBYTEUS_LLM_MODEL_ID).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/openai_llm.test.ts` (passed; OpenAI Responses path).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/openai_llm_image.test.ts` (passed; OpenAI Responses path).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/qwen_llm.test.ts -t "should successfully make a simple completion call"` (skipped: missing DASHSCOPE_API_KEY).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_zhipu_llm.py -q -k test_zhipu_llm_response` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/zhipu_llm.test.ts -t "should successfully make a simple completion call"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_zhipu_llm.py -q -k test_zhipu_llm_streaming` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/zhipu_llm.test.ts -t "should stream response incrementally"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_zhipu_llm.py -q -k test_send_user_message` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/zhipu_llm.test.ts -t "should support public sendUserMessage"` (passed).
- 2026-01-27: Ran `uv run python -m pytest tests/integration_tests/llm/api/test_zhipu_llm.py -q -k test_stream_user_message` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/integration/llm/api/zhipu_llm.test.ts -t "should support public streamUserMessage"` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/status/status_update_utils.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/events/agent_team_event_dispatcher.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/status/agent_team_status_manager.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/handlers/lifecycle_agent_team_event_handler.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/handlers/process_user_message_event_handler.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/handlers/tool_approval_team_event_handler.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/handlers/inter_agent_message_request_event_handler.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/streaming/agent_team_stream_events.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/streaming/agent_team_event_notifier.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/streaming/agent_team_event_stream.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/streaming/agent_event_bridge.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/streaming/team_event_bridge.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/streaming/agent_event_multiplexer.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/task_notification/activation_policy.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/task_notification/task_activator.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/task_notification/system_event_driven_agent_task_notifier.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/bootstrap_steps/task_notifier_initialization_step.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/bootstrap_steps/team_manifest_injection_step.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/bootstrap_steps/agent_configuration_preparation_step.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/bootstrap_steps/coordinator_initialization_step.test.ts` (passed).
- 2026-01-27: Ran `pnpm exec vitest --run tests/unit/agent_team/bootstrap_steps/agent_team_bootstrapper.test.ts` (passed).

## Tools Module

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/tools/tool_config.py` | `src/tools/tool_config.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | ToolConfig wrapper + tests |
| `autobyteus/tools/base_tool.py` | `src/tools/base_tool.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | ParameterSchema | Base tool coercion + validation |
| `autobyteus/tools/tool_state.py` | `src/tools/tool_state.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Dict-like ToolState container |
| `autobyteus/tools/tool_category.py` | `src/tools/tool_category.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Tool category enum |
| `autobyteus/tools/tool_origin.py` | `src/tools/tool_origin.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Tool origin enum |
| `autobyteus/tools/functional_tool.py` | `src/tools/functional_tool.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | ParameterSchema | Functional tool decorator |
| `autobyteus/tools/tool_meta.py` | `src/tools/tool_meta.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | ToolRegistry | Explicit registration helper |
| `autobyteus/tools/utils.py` | `src/tools/utils.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | ToolDefinition | Format tool usage info |
| `autobyteus/tools/__init__.py` | `src/tools/index.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Barrel exports for core tools |
| `autobyteus/tools/factory/tool_factory.py` | `src/tools/factory/tool_factory.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Abstract tool factory |
| `autobyteus/tools/file/read_file.py` | `src/tools/file/read_file.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | Tool registry, fs | Functional read_file tool |
| `autobyteus/tools/file/write_file.py` | `src/tools/file/write_file.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | Tool registry, fs | Functional write_file tool |
| `autobyteus/tools/file/patch_file.py` | `src/tools/file/patch_file.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | diff_utils, fs | Unified diff patch tool |
| `autobyteus/tools/registry/tool_definition.py` | `src/tools/registry/tool_definition.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Parity pass + tests added |
| `autobyteus/tools/registry/tool_registry.py` | `src/tools/registry/tool_registry.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | Singleton, Map | Parity pass + tests added |
| `autobyteus/tools/usage/formatters/default_json_schema_formatter.py` | `src/tools/usage/formatters/default_json_schema_formatter.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Provider-agnostic schema output |
| `autobyteus/tools/usage/formatters/openai_json_schema_formatter.py` | `src/tools/usage/formatters/openai_json_schema_formatter.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | OpenAI function schema |
| `autobyteus/tools/usage/formatters/openai_json_example_formatter.py` | `src/tools/usage/formatters/openai_json_example_formatter.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | OpenAI tool call examples |
| `autobyteus/tools/usage/formatters/anthropic_json_schema_formatter.py` | `src/tools/usage/formatters/anthropic_json_schema_formatter.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Anthropic JSON schema output |
| `autobyteus/tools/usage/formatters/anthropic_json_example_formatter.py` | `src/tools/usage/formatters/anthropic_json_example_formatter.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Anthropic XML example output |
| `autobyteus/tools/usage/formatters/gemini_json_schema_formatter.py` | `src/tools/usage/formatters/gemini_json_schema_formatter.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Gemini JSON schema output |
| `autobyteus/tools/usage/formatters/gemini_json_example_formatter.py` | `src/tools/usage/formatters/gemini_json_example_formatter.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Gemini JSON example output |
| `autobyteus/tools/usage/formatters/google_json_schema_formatter.py` | `src/tools/usage/formatters/google_json_schema_formatter.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Google JSON schema output |
| `autobyteus/tools/usage/formatters/google_json_example_formatter.py` | `src/tools/usage/formatters/google_json_example_formatter.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Google JSON example output |
| `autobyteus/tools/usage/formatters/mistral_json_schema_formatter.py` | `src/tools/usage/formatters/mistral_json_schema_formatter.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Mistral JSON schema output |
| `autobyteus/tools/usage/formatters/run_bash_xml_schema_formatter.py` | `src/tools/usage/formatters/run_bash_xml_schema_formatter.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | run_bash XML schema |
| `autobyteus/tools/usage/formatters/run_bash_xml_example_formatter.py` | `src/tools/usage/formatters/run_bash_xml_example_formatter.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | run_bash XML example |
| `autobyteus/tools/usage/tool_schema_provider.py` | `src/tools/usage/providers/tool_schema_provider.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | ToolRegistry | Provider-aware tool schema builder |
| `autobyteus/tools/search/providers.py` | `src/tools/search/providers.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Search provider enum |
| `autobyteus/tools/search/base_strategy.py` | `src/tools/search/base_strategy.ts` | Completed | N/A | N/A | N/A | N/A | None | Abstract search strategy interface |
| `autobyteus/tools/search/client.py` | `src/tools/search/client.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | base_strategy | Search client wrapper |
| `autobyteus/tools/search/serper_strategy.py` | `src/tools/search/serper_strategy.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | axios | Serper search strategy |
| `autobyteus/tools/search/serpapi_strategy.py` | `src/tools/search/serpapi_strategy.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | axios | SerpApi search strategy |
| `autobyteus/tools/search/google_cse_strategy.py` | `src/tools/search/google_cse_strategy.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | axios | Google CSE search strategy |
| `autobyteus/tools/search/factory.py` | `src/tools/search/factory.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | SearchClient | Search client factory |
| `autobyteus/tools/search_tool.py` | `src/tools/search_tool.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | Search module | search_web tool |
| `autobyteus/tools/web/read_url_tool.py` | `src/tools/web/read_url_tool.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | html_cleaner, axios | read_url tool |
| `autobyteus/tools/usage/formatters/default_xml_schema_formatter.py` | `src/tools/usage/formatters/default_xml_schema_formatter.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | ToolDefinition parity |
| `autobyteus/tools/usage/formatters/default_json_example_formatter.py` | `src/tools/usage/formatters/default_json_example_formatter.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | ToolDefinition parity |
| `autobyteus/tools/usage/formatters/default_xml_example_formatter.py` | `src/tools/usage/formatters/default_xml_example_formatter.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | ToolDefinition parity |
| `autobyteus/tools/usage/formatters/write_file_xml_schema_formatter.py` | `src/tools/usage/formatters/write_file_xml_schema_formatter.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | write_file XML schema |
| `autobyteus/tools/usage/formatters/write_file_xml_example_formatter.py` | `src/tools/usage/formatters/write_file_xml_example_formatter.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | write_file XML example |
| `autobyteus/tools/usage/formatters/patch_file_xml_schema_formatter.py` | `src/tools/usage/formatters/patch_file_xml_schema_formatter.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | patch_file XML schema |
| `autobyteus/tools/usage/formatters/patch_file_xml_example_formatter.py` | `src/tools/usage/formatters/patch_file_xml_example_formatter.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | patch_file XML example |
| `autobyteus/tools/usage/registries/tool_formatter_pair.py` | `src/tools/usage/registries/tool_formatter_pair.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Formatter pair container |
| `autobyteus/tools/usage/registries/tool_formatting_registry.py` | `src/tools/usage/registries/tool_formatting_registry.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | LLMProvider | Provider→formatter registry |
| `autobyteus/tools/usage/providers/tool_manifest_provider.py` | `src/tools/usage/providers/tool_manifest_provider.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | Formatting registry | Tool manifest builder |
| `autobyteus/tools/pydantic_schema_converter.py` | `src/tools/zod_schema_converter.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | zod | Pydantic converter adapted to Zod |
| `autobyteus/tools/terminal/types.py` | `src/tools/terminal/types.ts` | Completed | Created | 2026-01-27 Passed | Deferred | Deferred | None | Data containers; integration covered when terminal managers land |
| `autobyteus/tools/terminal/output_buffer.py` | `src/tools/terminal/output_buffer.ts` | Completed | Created | 2026-01-27 Passed | Deferred | Deferred | None | Integration coverage via terminal session tests once migrated |
| `autobyteus/tools/terminal/prompt_detector.py` | `src/tools/terminal/prompt_detector.ts` | Completed | Created | 2026-01-27 Passed | Deferred | Deferred | None | Integration coverage via terminal session tests once migrated |
| `autobyteus/tools/terminal/pty_session.py` | `src/tools/terminal/pty_session.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | node-pty | Integration tests require node-pty native build approval |
| `autobyteus/tools/terminal/session_factory.py` | `src/tools/terminal/session_factory.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | PtySession, WslTmuxSession | Factory selection parity |
| `autobyteus/tools/terminal/wsl_tmux_session.py` | `src/tools/terminal/wsl_tmux_session.ts` | Completed | Created | 2026-01-27 Passed | Deferred | Deferred | WSL, node-pty | Windows backend uses WSL bash; integration requires Windows+WSL |
| `autobyteus/tools/terminal/wsl_utils.py` | `src/tools/terminal/wsl_utils.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | WSL discovery + path conversion utilities |
| `autobyteus/tools/terminal/ansi_utils.py` | `src/tools/terminal/ansi_utils.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | ANSI escape cleanup helper |
| `autobyteus/tools/terminal/terminal_session_manager.py` | `src/tools/terminal/terminal_session_manager.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | OutputBuffer, PromptDetector, PtySession | Integration tests require node-pty native build approval |
| `autobyteus/tools/terminal/background_process_manager.py` | `src/tools/terminal/background_process_manager.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | OutputBuffer, PtySession | Integration tests require node-pty native build approval |
| `autobyteus/tools/terminal/tools/run_bash.py` | `src/tools/terminal/tools/run_bash.ts` | Completed | N/A | N/A | Created | 2026-01-27 Passed | TerminalSessionManager | Integration tests require node-pty native build approval |
| `autobyteus/tools/terminal/tools/start_background_process.py` | `src/tools/terminal/tools/start_background_process.ts` | Completed | N/A | N/A | Created | 2026-01-27 Passed | BackgroundProcessManager | Integration tests require node-pty native build approval |
| `autobyteus/tools/terminal/tools/get_process_output.py` | `src/tools/terminal/tools/get_process_output.ts` | Completed | N/A | N/A | Created | 2026-01-27 Passed | BackgroundProcessManager | Integration tests require node-pty native build approval |
| `autobyteus/tools/terminal/tools/stop_background_process.py` | `src/tools/terminal/tools/stop_background_process.ts` | Completed | N/A | N/A | Created | 2026-01-27 Passed | BackgroundProcessManager | Integration tests require node-pty native build approval |

## Tools Module (MCP)

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/tools/mcp/types.py` | `src/tools/mcp/types.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | MCP config and transport types |
| `autobyteus/tools/mcp/schema_mapper.py` | `src/tools/mcp/schema_mapper.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | ParameterSchema | MCP schema → ParameterSchema mapper |
| `autobyteus/tools/mcp/config_service.py` | `src/tools/mcp/config_service.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | types, fs | MCP configuration loader/service |
| `autobyteus/tools/mcp/server/proxy.py` | `src/tools/mcp/server/proxy.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | server_instance_manager | Proxy delegates tool calls |
| `autobyteus/tools/mcp/tool.py` | `src/tools/mcp/tool.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | proxy, ParameterSchema | Generic MCP tool wrapper |
| `autobyteus/tools/mcp/server_instance_manager.py` | `src/tools/mcp/server_instance_manager.ts` | Completed | Created | 2026-01-27 Passed | Deferred | Deferred | AgentContextRegistry, server classes | Workspace injection hook pending AgentContextRegistry |
| `autobyteus/tools/mcp/server/base_managed_mcp_server.py` | `src/tools/mcp/server/base_managed_mcp_server.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | types | Base MCP server lifecycle + state |
| `autobyteus/tools/mcp/factory.py` | `src/tools/mcp/factory.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | GenericMcpTool | MCP tool factory |
| `autobyteus/tools/mcp/server/stdio_managed_mcp_server.py` | `src/tools/mcp/server/stdio_managed_mcp_server.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | MCP SDK, stdio transport | Integration covered with pdf_mcp stdio server |
| `autobyteus/tools/mcp/server/http_managed_mcp_server.py` | `src/tools/mcp/server/http_managed_mcp_server.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | MCP SDK, HTTP transport | Integration covered with streamable_http_mcp_toy |
| `autobyteus/tools/mcp/server/websocket_managed_mcp_server.py` | `src/tools/mcp/server/websocket_managed_mcp_server.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | MCP SDK, WebSocket transport | Integration covered with wss_mcp_toy |
| `autobyteus/tools/mcp/tool_registrar.py` | `src/tools/mcp/tool_registrar.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | ToolRegistry, InstanceManager | Integration covered with pdf_mcp stdio server |
| `autobyteus/tools/mcp/__init__.py` | `src/tools/mcp/index.ts` | Completed | N/A | N/A | N/A | N/A | None | MCP module exports |
| `autobyteus/tools/mcp/server/__init__.py` | `src/tools/mcp/server/index.ts` | Completed | N/A | N/A | N/A | N/A | None | MCP server exports |

## Tools Module (Multimedia)

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/tools/multimedia/download_media_tool.py` | `src/tools/multimedia/download_media_tool.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | axios, fs, mime-types | Downloads media to workspace/default downloads; integration tests require live URLs |
| `autobyteus/tools/multimedia/media_reader_tool.py` | `src/tools/multimedia/media_reader_tool.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | fs, ContextFile | Resolves workspace-relative or absolute media paths |
| `autobyteus/tools/multimedia/__init__.py` | `src/tools/multimedia/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Multimedia tool exports |
| `autobyteus/tools/multimedia/image_tools.py` | `src/tools/multimedia/image_tools.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Failed (Gemini 429) | multimedia.image, download_utils | Integration tests aligned with Python flows; Integration failed: Gemini RESOURCE_EXHAUSTED (429) |
| `autobyteus/tools/multimedia/audio_tools.py` | `src/tools/multimedia/audio_tools.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed (1 skipped) | multimedia.audio, download_utils | Integration tests aligned with Python flows |

## LLM Module

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/llm/utils/messages.py` | `src/llm/utils/messages.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Core Message types |
| `autobyteus/llm/utils/token_usage.py` | `src/llm/utils/token_usage.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | zod | Token usage schema |
| `autobyteus/llm/utils/tool_call_delta.py` | `src/llm/utils/tool_call_delta.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | zod | Tool call delta schema |
| `autobyteus/llm/utils/response_types.py` | `src/llm/utils/response_types.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | TokenUsage | Response types |
| `autobyteus/llm/utils/llm_config.py` | `src/llm/utils/llm_config.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | LLM Configuration classes |
| `autobyteus/llm/providers.py` | `src/llm/providers.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Provider Enum |
| `autobyteus/llm/runtimes.py` | `src/llm/runtimes.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Runtime Enum |
| `autobyteus/llm/user_message.py` | `src/llm/user_message.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | User Message class |
| `autobyteus/llm/utils/token_usage_tracker.py` | `src/llm/utils/token_usage_tracker.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Token Usage logic |
| `autobyteus/llm/token_counter/base_token_counter.py` | `src/llm/token_counter/base_token_counter.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Base Token Counter |
| `autobyteus/llm/extensions/base_extension.py` | `src/llm/extensions/base_extension.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | BaseLLM (Type) | Base Extension class |
| `autobyteus/llm/extensions/extension_registry.py` | `src/llm/extensions/extension_registry.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Extension Registry |
| `autobyteus/llm/extensions/token_usage_tracking_extension.py` | `src/llm/extensions/token_usage_tracking_extension.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | TokenCounter | Token Usage Extension |
| `autobyteus/llm/models.py` | `src/llm/models.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | DynamicEnum | LLM Model definitions |
| `autobyteus/llm/base_llm.py` | `src/llm/base.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | All | Base LLM Interface |
| `autobyteus/llm/utils/media_payload_formatter.py` | `src/llm/utils/media_payload_formatter.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | axios, fs | Media processing |
| `autobyteus/llm/converters/openai_tool_call_converter.py` | `src/llm/converters/openai_tool_call_converter.ts` | Completed | Created | 2026-01-28 Passed | Created | 2026-01-27 Passed | None | Tool Call Converter |
| `autobyteus/llm/converters/anthropic_tool_call_converter.py` | `src/llm/converters/anthropic_tool_call_converter.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Tool Call Converter |
| `autobyteus/llm/converters/gemini_tool_call_converter.py` | `src/llm/converters/gemini_tool_call_converter.ts` | Completed | N/A | N/A | N/A | N/A | None | Gemini tool call converter |
| `autobyteus/llm/converters/mistral_tool_call_converter.py` | `src/llm/converters/mistral_tool_call_converter.ts` | Completed | N/A | N/A | N/A | N/A | None | Mistral tool call converter |
| `autobyteus/llm/api/openai_compatible_llm.py` | `src/llm/api/openai_compatible_llm.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | openai | OpenAI Base Wrapper |
| `autobyteus/llm/api/openai_responses_llm.py` | `src/llm/api/openai_responses_llm.ts` | Completed | N/A | N/A | N/A | N/A | openai | OpenAI Responses API wrapper (used by OpenAILLM) |
| `autobyteus/llm/api/openai_llm.py` | `src/llm/api/openai_llm.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | OpenAIResponsesLLM | OpenAI Provider |
| `autobyteus/llm/api/claude_llm.py` | `src/llm/api/anthropic_llm.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | @anthropic-ai/sdk | Anthropic Provider + image handling |
| `autobyteus/llm/api/gemini_llm.py` | `src/llm/api/gemini_llm.ts` | Completed | N/A | N/A | Created | 2026-01-27 Passed | @google/genai, gemini_helper, gemini_model_mapping | Gemini Provider |
| `autobyteus/llm/api/mistral_llm.py` | `src/llm/api/mistral_llm.ts` | Completed | N/A | N/A | Created | 2026-01-27 Passed | @mistralai/mistralai | Mistral Provider + image handling |
| `autobyteus/llm/api/deepseek_llm.py` | `src/llm/api/deepseek_llm.ts` | Completed | N/A | N/A | Created | 2026-01-27 Passed | OpenAICompatibleLLM | OpenAI-compatible DeepSeek API via base URL |
| `autobyteus/llm/api/grok_llm.py` | `src/llm/api/grok_llm.ts` | Completed | N/A | N/A | Created | 2026-01-27 Passed | OpenAICompatibleLLM | xAI Grok OpenAI-compatible API |
| `autobyteus/llm/api/kimi_llm.py` | `src/llm/api/kimi_llm.ts` | Completed | N/A | N/A | Created | 2026-01-27 Passed | OpenAICompatibleLLM | Moonshot Kimi OpenAI-compatible API |
| `autobyteus/llm/api/qwen_llm.py` | `src/llm/api/qwen_llm.ts` | Completed | N/A | N/A | Created | Skipped (2026-01-27 missing DASHSCOPE_API_KEY) | OpenAICompatibleLLM | Qwen OpenAI-compatible DashScope API |
| `autobyteus/llm/api/zhipu_llm.py` | `src/llm/api/zhipu_llm.ts` | Completed | N/A | N/A | Created | 2026-01-27 Passed | OpenAICompatibleLLM | Zhipu OpenAI-compatible API + thinking param mapping |
| `autobyteus/llm/api/minimax_llm.py` | `src/llm/api/minimax_llm.ts` | Completed | N/A | N/A | N/A | N/A | OpenAICompatibleLLM | Minimax OpenAI-compatible API |
| `autobyteus/llm/api/lmstudio_llm.py` | `src/llm/api/lmstudio_llm.ts` | Completed | N/A | N/A | Created | 2026-01-27 Passed | OpenAICompatibleLLM | Local LM Studio API wrapper |
| `autobyteus/llm/api/ollama_llm.py` | `src/llm/api/ollama_llm.ts` | Completed | N/A | N/A | Created | 2026-01-27 Passed | ollama | Ollama chat API wrapper |
| `autobyteus/llm/api/autobyteus_llm.py` | `src/llm/api/autobyteus_llm.ts` | Completed | N/A | N/A | Created | 2026-01-27 Passed | AutobyteusClient | Autobyteus-hosted LLM wrapper |
| `autobyteus/llm/lmstudio_provider.py` | `src/llm/lmstudio_provider.ts` | Completed | N/A | N/A | Created | Failed (2026-01-28 timeout; requires live server) | OpenAI SDK | LM Studio model discovery |
| `autobyteus/llm/ollama_provider.py` | `src/llm/ollama_provider.ts` | Completed | N/A | N/A | Created | Failed (2026-01-28 timeout; requires live server) | ollama | Ollama model discovery |
| `autobyteus/llm/ollama_provider_resolver.py` | `src/llm/ollama_provider_resolver.ts` | Completed | N/A | N/A | N/A | N/A | None | Provider keyword resolver for Ollama models |
| `autobyteus/llm/autobyteus_provider.py` | `src/llm/autobyteus_provider.ts` | Completed | N/A | N/A | Created | Failed (2026-01-28 timeout; requires live server) | AutobyteusClient | Autobyteus model discovery |
| `autobyteus/llm/llm_factory.py` | `src/llm/llm_factory.ts` | Completed | N/A | N/A | Created | 2026-01-27 Passed | LMStudio/Ollama/Autobyteus providers | Async registry + reload support |

## Utilities & Foundation

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `pyproject.toml` | `package.json` | Completed | N/A | N/A | N/A | N/A | N/A | Dependency mapping done, project init done |
| `autobyteus/utils/singleton.py` | `src/utils/singleton.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Core generic utility |
| `autobyteus/utils/tool_call_format.py` | `src/utils/tool_call_format.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | XML format utility |
| `autobyteus/utils/file_utils.py` | `src/utils/file_utils.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | fs, path | File system helpers |
| `autobyteus/utils/dynamic_enum.py` | `src/utils/dynamic_enum.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Dynamic enum implementation |
| `autobyteus/utils/diff_utils.py` | `src/utils/diff_utils.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | None | Unified diff application helper |
| `autobyteus/utils/parameter_schema.py` | `src/utils/parameter_schema.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | zod | JSON Schema helper |
| `autobyteus/utils/html_cleaner.py` | `src/utils/html_cleaner.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | cheerio | HTML cleaning utilities (BeautifulSoup → Cheerio) |
| N/A | `src/utils/logger.ts` | Completed | N/A | N/A | N/A | N/A | fs, util | Centralized logging helper (level + optional file sink) |
| `autobyteus/utils/gemini_helper.py` | `src/utils/gemini_helper.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | @google/genai | Gemini client bootstrap helper |
| `autobyteus/utils/gemini_model_mapping.py` | `src/utils/gemini_model_mapping.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Runtime-aware Gemini model mapping |
| `autobyteus/utils/download_utils.py` | `src/utils/download_utils.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | axios, fs, https | File download helper (URL/data URI/local) |
| `autobyteus/utils/llm_output_formatter.py` | `src/utils/llm_output_formatter.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Human-readable formatter for tool logs |

## Prompt Module

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/prompt/prompt_template.py` | `src/prompt/prompt_template.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Simple {{var}} templating |
| `autobyteus/prompt/prompt_builder.py` | `src/prompt/prompt_builder.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Builder for prompt templates |
| `autobyteus/prompt/__init__.py` | `src/prompt/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Prompt module exports |

## Clients

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/clients/autobyteus_client.py` | `src/clients/autobyteus_client.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | axios, https | HTTP client for Autobyteus server (httpx → axios) |
| `autobyteus/clients/cert_utils.py` | `src/clients/cert_utils.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | node:crypto | X.509 certificate helpers |
| `autobyteus/clients/__init__.py` | `src/clients/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Client module exports |

## RPC Module (Deprecated)

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/rpc/*` | N/A | Skipped | N/A | N/A | N/A | N/A | None | RPC module removed from Python codebase; not supported in Node.js |

## Workflow Module (Out of Scope)

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/workflow/*` | N/A | Skipped | N/A | N/A | N/A | N/A | None | Workflow module is not used and will not be migrated |

## Events Module

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/events/event_types.py` | `src/events/event_types.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Event type string enum |
| `autobyteus/events/event_manager.py` | `src/events/event_manager.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-28 Passed | Singleton | Topic-based event routing |
| `autobyteus/events/event_emitter.py` | `src/events/event_emitter.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-28 Passed | EventManager | EventEmitter wrapper |

## Agent Team Events

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent_team/events/agent_team_events.py` | `src/agent_team/events/agent_team_events.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | AgentInputUserMessage | Agent team event data classes |
| `autobyteus/agent_team/events/event_store.py` | `src/agent_team/events/event_store.ts` | Completed | N/A | N/A | N/A | N/A | BaseAgentTeamEvent | Agent team event store |
| `autobyteus/agent_team/events/agent_team_event_dispatcher.py` | `src/agent_team/events/agent_team_event_dispatcher.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | AgentTeamEventHandlerRegistry, status_update_utils | Dispatches team events + error/idle handling |
| `autobyteus/agent_team/events/agent_team_input_event_queue_manager.py` | `src/agent_team/events/agent_team_input_event_queue_manager.ts` | Completed | N/A | N/A | N/A | N/A | ProcessUserMessageEvent | Team input event queues |

## Agent Team Handlers

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent_team/handlers/base_agent_team_event_handler.py` | `src/agent_team/handlers/base_agent_team_event_handler.ts` | Completed | N/A | N/A | N/A | N/A | None | Abstract team event handler base |
| `autobyteus/agent_team/handlers/agent_team_event_handler_registry.py` | `src/agent_team/handlers/agent_team_event_handler_registry.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | BaseAgentTeamEventHandler | Team event handler registry |
| `autobyteus/agent_team/handlers/lifecycle_agent_team_event_handler.py` | `src/agent_team/handlers/lifecycle_agent_team_event_handler.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | AgentTeamStatus | Logs lifecycle events |
| `autobyteus/agent_team/handlers/process_user_message_event_handler.py` | `src/agent_team/handlers/process_user_message_event_handler.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | AgentTeamErrorEvent | Routes user messages to agents/sub-teams |
| `autobyteus/agent_team/handlers/tool_approval_team_event_handler.py` | `src/agent_team/handlers/tool_approval_team_event_handler.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | AgentTeamErrorEvent | Routes tool approvals to agents |
| `autobyteus/agent_team/handlers/inter_agent_message_request_event_handler.py` | `src/agent_team/handlers/inter_agent_message_request_event_handler.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | InterAgentMessage, AgentInputUserMessage | Routes inter-agent messages to agents/sub-teams |

## Agent Team Core

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent_team/exceptions.py` | `src/agent_team/exceptions.ts` | Completed | N/A | N/A | N/A | N/A | None | TeamNodeNotFoundException |
| `autobyteus/agent_team/context/team_node_config.py` | `src/agent_team/context/team_node_config.ts` | Completed | N/A | N/A | N/A | N/A | None | Team node definition wrapper |
| `autobyteus/agent_team/context/agent_team_config.py` | `src/agent_team/context/agent_team_config.ts` | Completed | N/A | N/A | N/A | N/A | TaskNotificationMode | Agent team config container |
| `autobyteus/agent_team/context/agent_team_runtime_state.py` | `src/agent_team/context/agent_team_runtime_state.ts` | Completed | N/A | N/A | N/A | N/A | AgentTeamStatus | Team runtime state container |
| `autobyteus/agent_team/context/agent_team_context.py` | `src/agent_team/context/agent_team_context.ts` | Completed | N/A | N/A | N/A | N/A | AgentTeamStatus, AgentTeamRuntimeState | Team context container |
| `autobyteus/agent_team/context/team_manager.py` | `src/agent_team/context/team_manager.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-28 Passed | AgentFactory, AgentTeamFactory | Team node lifecycle + routing |
| `autobyteus/agent_team/context/__init__.py` | `src/agent_team/context/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Context module exports |
| `autobyteus/agent_team/base_agent_team.py` | `src/agent_team/base_agent_team.ts` | Completed | N/A | N/A | N/A | N/A | None | Abstract team facade base |
| `autobyteus/agent_team/agent_team.py` | `src/agent_team/agent_team.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-28 Passed | AgentTeamRuntime | Agent team facade (start/stop/event submission) |
| `autobyteus/agent_team/agent_team_builder.py` | `src/agent_team/agent_team_builder.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-28 Passed | AgentTeamFactory | Fluent builder for team graph |

## Agent Team Task Notification

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent_team/task_notification/task_notification_mode.py` | `src/agent_team/task_notification/task_notification_mode.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Task notification mode enum + resolver |
| `autobyteus/agent_team/task_notification/activation_policy.py` | `src/agent_team/task_notification/activation_policy.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | Task | Determines agent activations for runnable tasks |
| `autobyteus/agent_team/task_notification/task_activator.py` | `src/agent_team/task_notification/task_activator.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | AgentInputUserMessage | Dispatches agent activation messages |
| `autobyteus/agent_team/task_notification/system_event_driven_agent_task_notifier.py` | `src/agent_team/task_notification/system_event_driven_agent_task_notifier.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | ActivationPolicy, TaskActivator | Orchestrates task-driven agent activation |

## Agent Team Bootstrap Steps

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent_team/bootstrap_steps/base_agent_team_bootstrap_step.py` | `src/agent_team/bootstrap_steps/base_agent_team_bootstrap_step.ts` | Completed | N/A | N/A | N/A | N/A | None | Abstract bootstrap step base |
| `autobyteus/agent_team/bootstrap_steps/task_notifier_initialization_step.py` | `src/agent_team/bootstrap_steps/task_notifier_initialization_step.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | SystemEventDrivenAgentTaskNotifier | Initializes task notifier |
| `autobyteus/agent_team/bootstrap_steps/team_context_initialization_step.py` | `src/agent_team/bootstrap_steps/team_context_initialization_step.ts` | Completed | N/A | N/A | N/A | N/A | TaskPlan | Initializes shared team context |
| `autobyteus/agent_team/bootstrap_steps/team_manifest_injection_step.py` | `src/agent_team/bootstrap_steps/team_manifest_injection_step.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | AgentConfig, AgentTeamConfig | Injects team manifest into prompts |
| `autobyteus/agent_team/bootstrap_steps/agent_configuration_preparation_step.py` | `src/agent_team/bootstrap_steps/agent_configuration_preparation_step.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | AgentConfig | Prepares final agent configs |
| `autobyteus/agent_team/bootstrap_steps/coordinator_initialization_step.py` | `src/agent_team/bootstrap_steps/coordinator_initialization_step.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | TeamManager | Initializes coordinator agent |
| `autobyteus/agent_team/bootstrap_steps/agent_team_bootstrapper.py` | `src/agent_team/bootstrap_steps/agent_team_bootstrapper.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | Bootstrap steps | Orchestrates bootstrap steps |

## Agent Team Status

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent_team/status/agent_team_status.py` | `src/agent_team/status/agent_team_status.ts` | Completed | N/A | N/A | N/A | N/A | None | Agent team status enum + helpers |
| `autobyteus/agent_team/status/status_deriver.py` | `src/agent_team/status/status_deriver.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | AgentTeamStatus | Status derivation logic |
| `autobyteus/agent_team/status/status_update_utils.py` | `src/agent_team/status/status_update_utils.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | AgentTeamStatusDeriver, AgentTeamEventStore | Apply events, derive status, emit updates |
| `autobyteus/agent_team/status/agent_team_status_manager.py` | `src/agent_team/status/agent_team_status_manager.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | AgentTeamStatus | Status notification bridge |

## Agent Team Streaming

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent_team/streaming/agent_team_stream_event_payloads.py` | `src/agent_team/streaming/agent_team_stream_event_payloads.ts` | Completed | N/A | N/A | Created | 2026-01-28 Passed | AgentTeamStatus, StreamEvent | Stream payload models |
| `autobyteus/agent_team/streaming/agent_team_stream_events.py` | `src/agent_team/streaming/agent_team_stream_events.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-28 Passed | TaskPlan events, payloads | Team stream event + validation |
| `autobyteus/agent_team/streaming/agent_team_event_notifier.py` | `src/agent_team/streaming/agent_team_event_notifier.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-28 Passed | EventEmitter, AgentTeamStreamEvent | Emits team stream events |
| `autobyteus/agent_team/streaming/agent_team_event_stream.py` | `src/agent_team/streaming/agent_team_event_stream.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-28 Passed | EventEmitter, queue_streamer | Team event stream consumer |
| `autobyteus/agent_team/streaming/agent_event_bridge.py` | `src/agent_team/streaming/agent_event_bridge.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-28 Passed | AgentEventStream, notifier | Bridges agent stream into team notifier |
| `autobyteus/agent_team/streaming/team_event_bridge.py` | `src/agent_team/streaming/team_event_bridge.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-28 Passed | AgentTeamEventStream, notifier | Bridges sub-team stream into parent notifier |
| `autobyteus/agent_team/streaming/agent_event_multiplexer.py` | `src/agent_team/streaming/agent_event_multiplexer.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-28 Passed | AgentEventBridge, TeamEventBridge | Manages event bridge lifecycle |

## Agent Team Utils

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent_team/utils/wait_for_idle.py` | `src/agent_team/utils/wait_for_idle.ts` | Completed | N/A | N/A | N/A | N/A | AgentTeamEventStream | Await idle/errored team status |

## Agent Team Shutdown Steps

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent_team/shutdown_steps/base_agent_team_shutdown_step.py` | `src/agent_team/shutdown_steps/base_agent_team_shutdown_step.ts` | Completed | N/A | N/A | N/A | N/A | None | Abstract shutdown step base |
| `autobyteus/agent_team/shutdown_steps/bridge_cleanup_step.py` | `src/agent_team/shutdown_steps/bridge_cleanup_step.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | AgentEventMultiplexer | Shutdown event bridges via multiplexer |
| `autobyteus/agent_team/shutdown_steps/sub_team_shutdown_step.py` | `src/agent_team/shutdown_steps/sub_team_shutdown_step.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | TeamManager | Shutdown running sub-teams |
| `autobyteus/agent_team/shutdown_steps/agent_team_shutdown_step.py` | `src/agent_team/shutdown_steps/agent_team_shutdown_step.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | TeamManager | Shutdown running agents |
| `autobyteus/agent_team/shutdown_steps/agent_team_shutdown_orchestrator.py` | `src/agent_team/shutdown_steps/agent_team_shutdown_orchestrator.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | Shutdown steps | Orchestrates shutdown sequence |

## Agent Team Runtime

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent_team/runtime/agent_team_worker.py` | `src/agent_team/runtime/agent_team_worker.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-28 Passed | Bootstrapper, Shutdown orchestrator | Team worker loop + event dispatch |
| `autobyteus/agent_team/runtime/agent_team_runtime.py` | `src/agent_team/runtime/agent_team_runtime.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-28 Passed | Status manager, multiplexer | Runtime facade over worker |
| `autobyteus/agent_team/runtime/__init__.py` | `src/agent_team/runtime/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Runtime module exports |

## Agent Team Factory

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent_team/factory/agent_team_factory.py` | `src/agent_team/factory/agent_team_factory.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-28 Passed | TeamManager, AgentTeamRuntime | Team assembly + registry wiring |
| `autobyteus/agent_team/factory/__init__.py` | `src/agent_team/factory/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Factory module exports |

## Agent Message

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/message/context_file_type.py` | `src/agent/message/context_file_type.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Context file type enum helpers |
| `autobyteus/agent/message/context_file.py` | `src/agent/message/context_file.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | ContextFileType | Context file model + helpers |
| `autobyteus/agent/sender_type.py` | `src/agent/sender_type.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Sender type enum + constants |
| `autobyteus/agent/message/agent_input_user_message.py` | `src/agent/message/agent_input_user_message.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | ContextFile, SenderType | Agent input user message model |
| `autobyteus/agent/message/inter_agent_message_type.py` | `src/agent/message/inter_agent_message_type.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | DynamicEnum | Inter-agent message type enum |
| `autobyteus/agent/message/inter_agent_message.py` | `src/agent/message/inter_agent_message.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | InterAgentMessageType | Inter-agent message model |
| `autobyteus/agent/message/multimodal_message_builder.py` | `src/agent/message/multimodal_message_builder.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | AgentInputUserMessage, LLMUserMessage | Build LLM user message from context files |
| `autobyteus/agent/message/send_message_to.py` | `src/agent/message/send_message_to.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | TeamManager, InterAgentMessageRequestEvent | Send message tool |
| `autobyteus/agent/message/__init__.py` | `src/agent/message/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Message module exports |

## Agent Workspace

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/workspace/workspace_config.py` | `src/agent/workspace/workspace_config.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Immutable config with stable hash/equality helpers |
| `autobyteus/agent/workspace/base_workspace.py` | `src/agent/workspace/base_workspace.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | WorkspaceConfig | Abstract workspace base |
| `autobyteus/agent/workspace/__init__.py` | `src/agent/workspace/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Workspace module exports |

## Agent Core

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/exceptions.py` | `src/agent/exceptions.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | AgentNotFoundException |
| `autobyteus/agent/processor_option.py` | `src/agent/processor_option.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | ProcessorOption + HookOption |
| `autobyteus/agent/status/status_enum.py` | `src/agent/status/status_enum.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | AgentStatus enum helpers |
| `autobyteus/agent/tool_invocation.py` | `src/agent/tool_invocation.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | ToolInvocation + ToolInvocationTurn |
| `autobyteus/agent/agent.py` | `src/agent/agent.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | AgentRuntime | Agent facade (start/stop/event submission) |
| `autobyteus/agent/remote_agent.py` | N/A | Skipped | N/A | N/A | N/A | N/A | rpc | Removed from Python codebase with RPC module |

## Agent Utils

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/utils/wait_for_idle.py` | `src/agent/utils/wait_for_idle.ts` | Completed | N/A | N/A | N/A | N/A | AgentEventStream | Wait for agent to reach IDLE status |
| `autobyteus/agent/utils/__init__.py` | `src/agent/utils/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Agent utils exports |

## Agent Factory

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/factory/agent_factory.py` | `src/agent/factory/agent_factory.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | AgentRuntime, handlers, SkillRegistry | Agent creation + default handler registry |
| `autobyteus/agent/factory/__init__.py` | `src/agent/factory/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Factory module exports |

## Agent Shutdown Steps

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/shutdown_steps/base_shutdown_step.py` | `src/agent/shutdown_steps/base_shutdown_step.ts` | Completed | N/A | N/A | N/A | N/A | None | Abstract shutdown step base |
| `autobyteus/agent/shutdown_steps/agent_shutdown_orchestrator.py` | `src/agent/shutdown_steps/agent_shutdown_orchestrator.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | Cleanup steps | Orchestrates shutdown sequence |
| `autobyteus/agent/shutdown_steps/llm_instance_cleanup_step.py` | `src/agent/shutdown_steps/llm_instance_cleanup_step.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | BaseShutdownStep | LLM instance cleanup |
| `autobyteus/agent/shutdown_steps/tool_cleanup_step.py` | `src/agent/shutdown_steps/tool_cleanup_step.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | BaseShutdownStep | Tool cleanup step |
| `autobyteus/agent/shutdown_steps/mcp_server_cleanup_step.py` | `src/agent/shutdown_steps/mcp_server_cleanup_step.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | McpServerInstanceManager | MCP server cleanup |
| `autobyteus/agent/shutdown_steps/__init__.py` | `src/agent/shutdown_steps/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Module exports |

## Agent Input Processors

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/input_processor/base_user_input_processor.py` | `src/agent/input_processor/base_user_input_processor.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Base input processor contract |
| `autobyteus/agent/input_processor/processor_definition.py` | `src/agent/input_processor/processor_definition.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Processor definition container |
| `autobyteus/agent/input_processor/processor_registry.py` | `src/agent/input_processor/processor_registry.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | Singleton, ProcessorOption | Input processor registry |
| `autobyteus/agent/input_processor/processor_meta.py` | N/A | Skipped | N/A | N/A | N/A | N/A | None | Metaclass removed; register explicitly if needed |
| `autobyteus/agent/input_processor/__init__.py` | `src/agent/input_processor/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Module exports |

## Agent Tool Invocation Preprocessors

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/tool_invocation_preprocessor/base_preprocessor.py` | `src/agent/tool_invocation_preprocessor/base_preprocessor.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Base tool invocation preprocessor |
| `autobyteus/agent/tool_invocation_preprocessor/processor_definition.py` | `src/agent/tool_invocation_preprocessor/processor_definition.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Preprocessor definition container |
| `autobyteus/agent/tool_invocation_preprocessor/processor_registry.py` | `src/agent/tool_invocation_preprocessor/processor_registry.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | Singleton, ProcessorOption | Preprocessor registry |
| `autobyteus/agent/tool_invocation_preprocessor/processor_meta.py` | N/A | Skipped | N/A | N/A | N/A | N/A | None | Metaclass removed; register explicitly if needed |
| `autobyteus/agent/tool_invocation_preprocessor/__init__.py` | `src/agent/tool_invocation_preprocessor/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Module exports |

## Agent Tool Execution Result Processors

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/tool_execution_result_processor/base_processor.py` | `src/agent/tool_execution_result_processor/base_processor.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Base tool execution result processor |
| `autobyteus/agent/tool_execution_result_processor/processor_definition.py` | `src/agent/tool_execution_result_processor/processor_definition.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Processor definition container |
| `autobyteus/agent/tool_execution_result_processor/processor_registry.py` | `src/agent/tool_execution_result_processor/processor_registry.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | Singleton, ProcessorOption | Processor registry |
| `autobyteus/agent/tool_execution_result_processor/processor_meta.py` | N/A | Skipped | N/A | N/A | N/A | N/A | None | Metaclass removed; register explicitly if needed |
| `autobyteus/agent/tool_execution_result_processor/__init__.py` | `src/agent/tool_execution_result_processor/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Module exports |

## Agent LLM Response Processors

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/llm_response_processor/base_processor.py` | `src/agent/llm_response_processor/base_processor.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Base LLM response processor |
| `autobyteus/agent/llm_response_processor/processor_definition.py` | `src/agent/llm_response_processor/processor_definition.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Processor definition container |
| `autobyteus/agent/llm_response_processor/processor_registry.py` | `src/agent/llm_response_processor/processor_registry.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | Singleton, ProcessorOption | Processor registry |
| `autobyteus/agent/llm_response_processor/processor_meta.py` | N/A | Skipped | N/A | N/A | N/A | N/A | None | Metaclass removed; register explicitly if needed |
| `autobyteus/agent/llm_response_processor/__init__.py` | `src/agent/llm_response_processor/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Module exports |

## Agent Status

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/status/status_enum.py` | `src/agent/status/status_enum.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | AgentStatus enum helpers |
| `autobyteus/agent/status/status_deriver.py` | `src/agent/status/status_deriver.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | Agent events | Status transition reducer |
| `autobyteus/agent/status/manager.py` | `src/agent/status/manager.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | LifecycleEvent, AgentConfig | Status notification manager |
| `autobyteus/agent/status/status_update_utils.py` | `src/agent/status/status_update_utils.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | EventStore, AgentContext | Status update helpers |
| `autobyteus/agent/status/__init__.py` | `src/agent/status/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Status module exports |

## Agent Lifecycle

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/lifecycle/events.py` | `src/agent/lifecycle/events.ts` | Completed | N/A | 2026-01-28 Passed | N/A | N/A | None | LifecycleEvent enum |
| `autobyteus/agent/lifecycle/__init__.py` | `src/agent/lifecycle/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Lifecycle module exports |

## Agent Context

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/context/agent_context_registry.py` | `src/agent/context/agent_context_registry.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | Singleton, WeakRef | Weak reference registry |
| `autobyteus/agent/context/agent_runtime_state.py` | `src/agent/context/agent_runtime_state.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Runtime state container |
| `autobyteus/agent/context/agent_config.py` | `src/agent/context/agent_config.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | System prompt processors, tool call format | Agent configuration model |
| `autobyteus/agent/context/agent_context.py` | `src/agent/context/agent_context.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | AgentConfig, AgentRuntimeState | Context facade |
| `autobyteus/agent/context/__init__.py` | `src/agent/context/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Agent context exports |

## Agent System Prompt Processor

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/system_prompt_processor/base_processor.py` | `src/agent/system_prompt_processor/base_processor.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Abstract processor base (runtime checks in TS) |
| `autobyteus/agent/system_prompt_processor/tool_manifest_injector_processor.py` | `src/agent/system_prompt_processor/tool_manifest_injector_processor.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | ToolRegistry, ToolManifestProvider | Injects tool manifest into prompt |
| `autobyteus/agent/system_prompt_processor/available_skills_processor.py` | `src/agent/system_prompt_processor/available_skills_processor.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | SkillRegistry | Injects skill catalog |
| `autobyteus/agent/system_prompt_processor/processor_definition.py` | `src/agent/system_prompt_processor/processor_definition.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Processor definition container |
| `autobyteus/agent/system_prompt_processor/processor_registry.py` | `src/agent/system_prompt_processor/processor_registry.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | Singleton, ProcessorOption | Processor registry |
| `autobyteus/agent/system_prompt_processor/processor_meta.py` | N/A | Skipped | N/A | N/A | N/A | N/A | None | Replaced by explicit register function in composition root |
| N/A | `src/agent/system_prompt_processor/register_system_prompt_processors.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | Registry | Explicit registration for default processors |
| `autobyteus/agent/system_prompt_processor/__init__.py` | `src/agent/system_prompt_processor/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Module exports |

## Agent Events

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/events/agent_events.py` | `src/agent/events/agent_events.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | Agent messages, ToolInvocation, LLMUserMessage | Agent event data classes |
| `autobyteus/agent/events/event_store.py` | `src/agent/events/event_store.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | BaseEvent | Agent event store + envelopes |
| `autobyteus/agent/events/agent_input_event_queue_manager.py` | `src/agent/events/agent_input_event_queue_manager.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | BaseEvent | Async input queue manager |
| `autobyteus/agent/events/worker_event_dispatcher.py` | `src/agent/events/worker_event_dispatcher.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | Status utils, handler registry | Dispatches events + status updates |
| `autobyteus/agent/events/notifiers.py` | `src/agent/events/notifiers.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | EventEmitter, EventType | External notifier for agent status/output events |

## Agent Handlers

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/handlers/base_event_handler.py` | `src/agent/handlers/base_event_handler.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | Agent events, Agent context | Abstract handler base |
| `autobyteus/agent/handlers/event_handler_registry.py` | `src/agent/handlers/event_handler_registry.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | BaseEvent, AgentEventHandler | Event handler registry |
| `autobyteus/agent/handlers/generic_event_handler.py` | `src/agent/handlers/generic_event_handler.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | GenericEvent, AgentContext | Generic event logging handler |
| `autobyteus/agent/handlers/user_input_message_event_handler.py` | `src/agent/handlers/user_input_message_event_handler.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | AgentInputUserMessage, Input processors | User message preprocessing + LLM event |
| `autobyteus/agent/handlers/lifecycle_event_logger.py` | `src/agent/handlers/lifecycle_event_logger.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | Agent events, AgentStatus | Lifecycle logging handler |
| `autobyteus/agent/handlers/approved_tool_invocation_event_handler.py` | `src/agent/handlers/approved_tool_invocation_event_handler.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | ToolInvocation, ToolResultEvent | Approved tool execution handler |
| `autobyteus/agent/handlers/tool_result_event_handler.py` | `src/agent/handlers/tool_result_event_handler.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | ToolResultEvent, ContextFile | Tool result aggregation + dispatch |
| `autobyteus/agent/handlers/tool_execution_approval_event_handler.py` | `src/agent/handlers/tool_execution_approval_event_handler.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-28 Passed | ToolExecutionApprovalEvent | Tool approval routing (integration: tests/integration/agent/tool_approval_flow.test.ts) |
| `autobyteus/agent/handlers/tool_invocation_request_event_handler.py` | `src/agent/handlers/tool_invocation_request_event_handler.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-28 Passed | ToolInvocation, ToolResultEvent | Tool approval/direct execution handler (integration: tests/integration/agent/tool_approval_flow.test.ts) |
| `autobyteus/agent/handlers/llm_complete_response_received_event_handler.py` | `src/agent/handlers/llm_complete_response_received_event_handler.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | CompleteResponse, LLM processors | LLM completion handler |
| `autobyteus/agent/handlers/llm_user_message_ready_event_handler.py` | `src/agent/handlers/llm_user_message_ready_event_handler.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | Streaming handlers, LLMUserMessage | LLM stream handler + tool parsing |
| `autobyteus/agent/handlers/inter_agent_message_event_handler.py` | `src/agent/handlers/inter_agent_message_event_handler.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | InterAgentMessage | Inter-agent message handler |
| `autobyteus/agent/handlers/bootstrap_event_handler.py` | `src/agent/handlers/bootstrap_event_handler.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | AgentBootstrapper | Bootstrap orchestration handler |

## Agent Streaming (Segments)

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/streaming/segments/segment_events.py` | `src/agent/streaming/segments/segment_events.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | None | Segment event data + helpers |
| `autobyteus/agent/streaming/parser/events.py` | `src/agent/streaming/parser/events.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Parser shim re-export |

## Agent Streaming (Stream Events)

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/streaming/events/stream_event_payloads.py` | `src/agent/streaming/events/stream_event_payloads.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | TokenUsage, AgentStatus | Stream payload models + factories |
| `autobyteus/agent/streaming/stream_event_payloads.py` | `src/agent/streaming/stream_event_payloads.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | None | Compatibility re-export |
| `autobyteus/agent/streaming/events/stream_events.py` | `src/agent/streaming/events/stream_events.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | Stream payloads | Stream event model + mapping |
| `autobyteus/agent/streaming/stream_events.py` | `src/agent/streaming/stream_events.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | None | Compatibility re-export |

## Agent Streaming (Utils)

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/streaming/utils/queue_streamer.py` | `src/agent/streaming/utils/queue_streamer.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Async generator over SimpleQueue |
| `autobyteus/agent/streaming/queue_streamer.py` | `src/agent/streaming/queue_streamer.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | None | Compatibility re-export |

## Agent Streaming (Streams)

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/streaming/streams/agent_event_stream.py` | `src/agent/streaming/streams/agent_event_stream.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | EventEmitter, Stream events | Stream wrapper for agent notifier |
| `autobyteus/agent/streaming/agent_event_stream.py` | `src/agent/streaming/agent_event_stream.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | None | Compatibility re-export |

## Agent Runtime

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/runtime/agent_runtime.py` | `src/agent/runtime/agent_runtime.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | AgentWorker, StatusManager | Runtime facade (start/stop/submit) |
| `autobyteus/agent/runtime/agent_worker.py` | `src/agent/runtime/agent_worker.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | WorkerEventDispatcher, queues | Covered via AgentRuntime start/stop integration |
| `autobyteus/agent/runtime/agent_thread_pool_manager.py` | N/A | Skipped | N/A | N/A | N/A | N/A | None | Node runtime uses async mailbox, no thread pool |
| `autobyteus/agent/runtime/__init__.py` | `src/agent/runtime/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Runtime exports |

## Agent Streaming (Handlers)

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/streaming/handlers/streaming_response_handler.py` | `src/agent/streaming/handlers/streaming_response_handler.ts` | Completed | N/A | N/A | N/A | N/A | ChunkResponse, SegmentEvent | Abstract streaming handler base |
| `autobyteus/agent/streaming/handlers/parsing_streaming_response_handler.py` | `src/agent/streaming/handlers/parsing_streaming_response_handler.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | StreamingParser, ToolInvocationAdapter | Parser-backed streaming handler |
| `autobyteus/agent/streaming/handlers/streaming_handler_factory.py` | `src/agent/streaming/handlers/streaming_handler_factory.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | Tool schema provider, handler selection | Streaming handler factory |
| `autobyteus/agent/streaming/handlers/pass_through_streaming_response_handler.py` | `src/agent/streaming/handlers/pass_through_streaming_response_handler.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | SegmentEvent, ToolInvocation | Pass-through handler for text-only streams |
| `autobyteus/agent/streaming/handlers/api_tool_call_streaming_response_handler.py` | `src/agent/streaming/handlers/api_tool_call_streaming_response_handler.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | ToolInvocationAdapter, file streamers | API tool-call streaming handler |
| `autobyteus/agent/streaming/api_tool_call_streaming_response_handler.py` | `src/agent/streaming/api_tool_call_streaming_response_handler.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | None | Compatibility re-export |
| `autobyteus/agent/streaming/parsing_streaming_response_handler.py` | `src/agent/streaming/parsing_streaming_response_handler.ts` | Completed | N/A | N/A | N/A | N/A | None | Compatibility re-export |
| `autobyteus/agent/streaming/handlers/__init__.py` | `src/agent/streaming/handlers/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Handler exports |

## Agent Streaming (API Tool Call)

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/streaming/api_tool_call/json_string_field_extractor.py` | `src/agent/streaming/api_tool_call/json_string_field_extractor.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Incremental JSON string extractor |
| `autobyteus/agent/streaming/api_tool_call/file_content_streamer.py` | `src/agent/streaming/api_tool_call/file_content_streamer.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | JsonStringFieldExtractor | write/patch file streamers |

## Agent Streaming (Adapters)

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/streaming/adapters/tool_syntax_registry.py` | `src/agent/streaming/adapters/tool_syntax_registry.ts` | Completed | N/A | N/A | N/A | N/A | SegmentType | SegmentType → tool mapping |
| `autobyteus/agent/streaming/adapters/tool_call_parsing.py` | `src/agent/streaming/adapters/tool_call_parsing.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | JSON parsing | XML/JSON tool argument parsing |
| `autobyteus/agent/streaming/adapters/invocation_adapter.py` | `src/agent/streaming/adapters/invocation_adapter.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | ToolInvocation, SegmentEvent | Segment → ToolInvocation adapter |
| `autobyteus/agent/streaming/parser/invocation_adapter.py` | `src/agent/streaming/parser/invocation_adapter.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | Compatibility re-export |

## Agent Streaming (Parser Core)

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/streaming/parser/stream_scanner.py` | `src/agent/streaming/parser/stream_scanner.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | None | String buffer cursor utility |
| `autobyteus/agent/streaming/parser/event_emitter.py` | `src/agent/streaming/parser/event_emitter.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | SegmentEvent | Segment event queueing helper |
| `autobyteus/agent/streaming/parser/parser_context.py` | `src/agent/streaming/parser/parser_context.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | StreamScanner, EventEmitter | Parser state context + config |
| `autobyteus/agent/streaming/parser/strategies/registry.py` | `src/agent/streaming/parser/strategies/registry.ts` | Completed | N/A | N/A | N/A | N/A | Strategies | Detection strategy registry |
| `autobyteus/agent/streaming/parser/sentinel_format.py` | `src/agent/streaming/parser/sentinel_format.ts` | Completed | N/A | N/A | N/A | N/A | None | Sentinel marker constants |
| `autobyteus/agent/streaming/parser/tool_constants.py` | `src/agent/streaming/parser/tool_constants.ts` | Completed | N/A | N/A | N/A | N/A | None | XML tool name constants |
| `autobyteus/agent/streaming/parser/xml_tool_parsing_state_registry.py` | `src/agent/streaming/parser/xml_tool_parsing_state_registry.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | XmlToolParsingState | Tool name → XML parsing state registry |
| `autobyteus/agent/streaming/parser/state_factory.py` | `src/agent/streaming/parser/state_factory.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | Parser states | State construction helpers |
| `autobyteus/agent/streaming/parser/streaming_parser.py` | `src/agent/streaming/parser/streaming_parser.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | ParserContext, states | Streaming parser driver + extract helpers |
| `autobyteus/agent/streaming/parser/parser_factory.py` | `src/agent/streaming/parser/parser_factory.ts` | Completed | Created | 2026-01-27 Passed | Created | 2026-01-27 Passed | StreamingParser | Parser factory + strategy selection |
| `autobyteus/agent/streaming/parser/__init__.py` | `src/agent/streaming/parser/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Parser exports |

## Agent Streaming (JSON Parsing Strategies)

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/streaming/parser/json_parsing_strategies/base.py` | `src/agent/streaming/parser/json_parsing_strategies/base.ts` | Completed | Created | 2026-01-28 Passed | Created | 2026-01-27 Passed | None | Shared types + argument coercion |
| `autobyteus/agent/streaming/parser/json_parsing_strategies/default.py` | `src/agent/streaming/parser/json_parsing_strategies/default.ts` | Completed | Created | 2026-01-28 Passed | Created | 2026-01-27 Passed | None | Default tool call parser |
| `autobyteus/agent/streaming/parser/json_parsing_strategies/openai.py` | `src/agent/streaming/parser/json_parsing_strategies/openai.ts` | Completed | Created | 2026-01-28 Passed | Created | 2026-01-27 Passed | None | OpenAI-like tool call parser |
| `autobyteus/agent/streaming/parser/json_parsing_strategies/gemini.py` | `src/agent/streaming/parser/json_parsing_strategies/gemini.ts` | Completed | Created | 2026-01-28 Passed | Created | 2026-01-27 Passed | None | Gemini tool call parser |
| `autobyteus/agent/streaming/parser/json_parsing_strategies/registry.py` | `src/agent/streaming/parser/json_parsing_strategies/registry.ts` | Completed | Created | 2026-01-28 Passed | Created | 2026-01-27 Passed | LLMProvider, tool_call_format | Provider-aware profiles |
| `autobyteus/agent/streaming/parser/json_parsing_strategies/__init__.py` | `src/agent/streaming/parser/json_parsing_strategies/index.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | None | Barrel exports |

## Agent Streaming (Parser States)

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/streaming/parser/states/base_state.py` | `src/agent/streaming/parser/states/base_state.ts` | Completed | N/A | N/A | N/A | N/A | ParserContext | Abstract state base |
| `autobyteus/agent/streaming/parser/states/text_state.py` | `src/agent/streaming/parser/states/text_state.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | Strategies, XmlTagInit | Text parsing state |
| `autobyteus/agent/streaming/parser/states/json_initialization_state.py` | `src/agent/streaming/parser/states/json_initialization_state.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | ParserConfig | JSON signature detection state |
| `autobyteus/agent/streaming/parser/states/json_tool_parsing_state.py` | `src/agent/streaming/parser/states/json_tool_parsing_state.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | Segment events | JSON tool content parsing |
| `autobyteus/agent/streaming/parser/states/delimited_content_state.py` | `src/agent/streaming/parser/states/delimited_content_state.ts` | Completed | N/A | N/A | N/A | N/A | Segment events | Base delimited content parsing |
| `autobyteus/agent/streaming/parser/states/xml_tool_parsing_state.py` | `src/agent/streaming/parser/states/xml_tool_parsing_state.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | DelimitedContentState | Generic XML tool content parsing |
| `autobyteus/agent/streaming/parser/states/custom_xml_tag_write_file_parsing_state.py` | `src/agent/streaming/parser/states/custom_xml_tag_write_file_parsing_state.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | DelimitedContentState | Legacy <write_file> tag parsing |
| `autobyteus/agent/streaming/parser/states/custom_xml_tag_run_bash_parsing_state.py` | `src/agent/streaming/parser/states/custom_xml_tag_run_bash_parsing_state.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | DelimitedContentState | Legacy <run_bash> tag parsing |
| `autobyteus/agent/streaming/parser/states/xml_run_bash_tool_parsing_state.py` | `src/agent/streaming/parser/states/xml_run_bash_tool_parsing_state.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | XmlToolParsingState | run_bash tool parsing |
| `autobyteus/agent/streaming/parser/states/xml_write_file_tool_parsing_state.py` | `src/agent/streaming/parser/states/xml_write_file_tool_parsing_state.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | XmlToolParsingState | write_file tool parsing with content markers |
| `autobyteus/agent/streaming/parser/states/xml_patch_file_tool_parsing_state.py` | `src/agent/streaming/parser/states/xml_patch_file_tool_parsing_state.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | XmlToolParsingState | patch_file tool parsing with patch markers |
| `autobyteus/agent/streaming/parser/states/xml_tag_initialization_state.py` | `src/agent/streaming/parser/states/xml_tag_initialization_state.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | Xml parser states | XML tag detection + dispatch |
| `autobyteus/agent/streaming/parser/states/sentinel_content_state.py` | `src/agent/streaming/parser/states/sentinel_content_state.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | DelimitedContentState | Covered by sentinel parser tests |
| `autobyteus/agent/streaming/parser/states/sentinel_initialization_state.py` | `src/agent/streaming/parser/states/sentinel_initialization_state.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | Sentinel parser states | Sentinel header parsing + dispatch |

## Agent Streaming (Module Exports)

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/streaming/__init__.py` | `src/agent/streaming/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Streaming module exports |

## Agent Lifecycle

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/lifecycle/events.py` | `src/agent/lifecycle/events.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | None | Lifecycle event enum |
| `autobyteus/agent/lifecycle/base_processor.py` | `src/agent/lifecycle/base_processor.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | LifecycleEvent | Base lifecycle processor |
| `autobyteus/agent/lifecycle/processor_definition.py` | `src/agent/lifecycle/processor_definition.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | None | Processor definition |
| `autobyteus/agent/lifecycle/processor_registry.py` | `src/agent/lifecycle/processor_registry.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | Singleton, ProcessorOption | Processor registry |
| `autobyteus/agent/lifecycle/__init__.py` | `src/agent/lifecycle/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Lifecycle module exports |

## Agent Bootstrap Steps

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/agent/bootstrap_steps/base_bootstrap_step.py` | `src/agent/bootstrap_steps/base_bootstrap_step.ts` | Completed | N/A | N/A | N/A | N/A | None | Abstract bootstrap step base |
| `autobyteus/agent/bootstrap_steps/agent_bootstrapper.py` | `src/agent/bootstrap_steps/agent_bootstrapper.ts` | Completed | Created | 2026-01-27 Passed | N/A | N/A | Bootstrap steps | Default bootstrap step sequence |
| `autobyteus/agent/bootstrap_steps/workspace_context_initialization_step.py` | `src/agent/bootstrap_steps/workspace_context_initialization_step.ts` | Completed | N/A | N/A | N/A | N/A | Workspace | Workspace context injection |
| `autobyteus/agent/bootstrap_steps/system_prompt_processing_step.py` | `src/agent/bootstrap_steps/system_prompt_processing_step.ts` | Completed | N/A | N/A | N/A | N/A | System prompt processors | Applies system prompt processors |
| `autobyteus/agent/bootstrap_steps/mcp_server_prewarming_step.py` | `src/agent/bootstrap_steps/mcp_server_prewarming_step.ts` | Completed | N/A | N/A | N/A | N/A | MCP config + server manager | Pre-warms MCP servers |

## CLI

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/cli/cli_display.py` | `src/cli/agent/cli_display.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | StreamEvent, Segment events | CLI display renderer for stream events |
| `autobyteus/cli/agent_cli.py` | `src/cli/agent/agent_cli.ts` | Completed | N/A | N/A | N/A | N/A | AgentEventStream, AgentInputUserMessage, node:readline/promises | Interactive CLI session loop |
| `autobyteus/cli/agent_team_tui/state.py` | `src/cli/agent_team/state_store.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | AgentTeamStreamEvent, task events | TUI state store for team view |
| `autobyteus/cli/agent_team_tui/widgets/shared.py` | `src/cli/agent_team/widgets/shared.ts` | Completed | N/A | N/A | N/A | N/A | AgentStatus, TaskStatus | Shared status/icon constants |
| `autobyteus/cli/agent_team_tui/app.py` | `src/cli/agent_team/app.tsx` | Completed | N/A | N/A | N/A | N/A | ink, react, AgentTeamEventStream | Ink-based team console (sidebar + focus pane) |
| `autobyteus/cli/agent_team_tui/widgets/renderables.py` | `src/cli/agent_team/widgets/renderables.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | Stream event payloads | Formatting helpers for focus pane output |
| `autobyteus/cli/agent_team_tui/widgets/agent_list_sidebar.py` | `src/cli/agent_team/widgets/agent_list_sidebar.tsx` | Completed | N/A | N/A | N/A | N/A | ink | Sidebar tree renderer |
| `autobyteus/cli/agent_team_tui/widgets/status_bar.py` | `src/cli/agent_team/widgets/status_bar.tsx` | Completed | N/A | N/A | N/A | N/A | ink | Footer status bar |
| `autobyteus/cli/agent_team_tui/widgets/logo.py` | `src/cli/agent_team/widgets/logo.tsx` | Completed | N/A | N/A | N/A | N/A | ink | Ink logo + tagline |
| `autobyteus/cli/agent_team_tui/widgets/task_plan_panel.py` | `src/cli/agent_team/widgets/task_plan_panel.tsx` | Completed | N/A | N/A | N/A | N/A | ink | Task plan summary panel |
| `autobyteus/cli/agent_team_tui/widgets/focus_pane.py` | `src/cli/agent_team/widgets/focus_pane.tsx` | Completed | N/A | N/A | N/A | N/A | ink | Focus pane with input + approvals |
| `autobyteus/cli/__init__.py` | `src/cli/index.ts` | Completed | N/A | N/A | N/A | N/A | None | CLI module exports |
| `autobyteus/cli/agent_team_tui/widgets/__init__.py` | `src/cli/agent_team/widgets/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Widget exports |
| `autobyteus/cli/agent_team_tui/app.css` | N/A | Skipped | N/A | N/A | N/A | N/A | None | Textual CSS not applicable to Ink UI |
| `autobyteus/cli/agent_team_tui/__init__.py` | N/A | Skipped | N/A | N/A | N/A | N/A | None | Textual module docstring (Ink app entry in app.tsx) |
| `autobyteus/cli/workflow_tui/app.py` | N/A | Skipped | N/A | N/A | N/A | N/A | None | Workflow module out of scope for Node migration |
| `autobyteus/cli/workflow_tui/state.py` | N/A | Skipped | N/A | N/A | N/A | N/A | None | Workflow module out of scope for Node migration |
| `autobyteus/cli/workflow_tui/app.css` | N/A | Skipped | N/A | N/A | N/A | N/A | None | Workflow module out of scope for Node migration |
| `autobyteus/cli/workflow_tui/__init__.py` | N/A | Skipped | N/A | N/A | N/A | N/A | None | Workflow module out of scope for Node migration |
| `autobyteus/cli/workflow_tui/widgets/__init__.py` | N/A | Skipped | N/A | N/A | N/A | N/A | None | Workflow module out of scope for Node migration |
| `autobyteus/cli/workflow_tui/widgets/agent_list_sidebar.py` | N/A | Skipped | N/A | N/A | N/A | N/A | None | Workflow module out of scope for Node migration |
| `autobyteus/cli/workflow_tui/widgets/focus_pane.py` | N/A | Skipped | N/A | N/A | N/A | N/A | None | Workflow module out of scope for Node migration |
| `autobyteus/cli/workflow_tui/widgets/logo.py` | N/A | Skipped | N/A | N/A | N/A | N/A | None | Workflow module out of scope for Node migration |
| `autobyteus/cli/workflow_tui/widgets/renderables.py` | N/A | Skipped | N/A | N/A | N/A | N/A | None | Workflow module out of scope for Node migration |
| `autobyteus/cli/workflow_tui/widgets/shared.py` | N/A | Skipped | N/A | N/A | N/A | N/A | None | Workflow module out of scope for Node migration |
| `autobyteus/cli/workflow_tui/widgets/status_bar.py` | N/A | Skipped | N/A | N/A | N/A | N/A | None | Workflow module out of scope for Node migration |

## Examples

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `examples/run_poem_writer.py` | `examples/run_poem_writer.ts` | Completed | N/A | N/A | N/A | N/A | AgentConfig, write_file | CLI-driven poem writer |
| `examples/run_agent_with_skill.py` | `examples/run_agent_with_skill.ts` | Completed | N/A | N/A | N/A | N/A | SkillRegistry, run_bash | Preloaded skill example |
| `examples/run_agentic_software_engineer.py` | `examples/run_agentic_software_engineer.ts` | Completed | N/A | N/A | N/A | N/A | ToolRegistry, workspace | Local tools + SWE prompt |
| `examples/run_browser_agent.py` | `examples/run_browser_agent.ts` | Completed | N/A | N/A | N/A | N/A | MCP registrar | Browser MCP agent |
| `examples/run_google_slides_agent.py` | `examples/run_google_slides_agent.ts` | Completed | N/A | N/A | N/A | N/A | MCP registrar | Google Slides MCP agent |
| `examples/run_sqlite_agent.py` | `examples/run_sqlite_agent.ts` | Completed | N/A | N/A | N/A | N/A | MCP registrar | SQLite MCP agent |
| `examples/discover_status_transitions.py` | `examples/discover_status_transitions.ts` | Completed | N/A | N/A | N/A | N/A | AgentStatusDeriver | Status transition table |
| `examples/prompts/agentic_software_engineer.prompt` | `examples/prompts/agentic_software_engineer.prompt` | Completed | N/A | N/A | N/A | N/A | None | Prompt file copied |
| `examples/skills/image_concatenator/SKILL.md` | `examples/skills/image_concatenator/SKILL.md` | Completed | N/A | N/A | N/A | N/A | None | Skill metadata copied |
| `examples/agent_team/README.md` | `examples/agent_team/README.md` | Completed | N/A | N/A | N/A | N/A | Ink CLI | TS agent team README |
| `examples/agent_team/manual_notification/run_basic_research_team.py` | `examples/agent_team/manual_notification/run_basic_research_team.ts` | Completed | N/A | N/A | N/A | N/A | SendMessageTo | Basic research team |
| `examples/agent_team/manual_notification/run_multi_researcher_team.py` | `examples/agent_team/manual_notification/run_multi_researcher_team.ts` | Completed | N/A | N/A | N/A | N/A | SendMessageTo | Multi-specialist team |
| `examples/agent_team/manual_notification/run_team_with_tui.py` | `examples/agent_team/manual_notification/run_team_with_tui.ts` | Completed | N/A | N/A | N/A | N/A | Task tools | TUI demo team |
| `examples/agent_team/manual_notification/run_debate_team.py` | `examples/agent_team/manual_notification/run_debate_team.ts` | Completed | N/A | N/A | N/A | N/A | Sub-team configs | Hierarchical debate team |
| `examples/agent_team/manual_notification/run_software_engineering_team.py` | `examples/agent_team/manual_notification/run_software_engineering_team.ts` | Completed | N/A | N/A | N/A | N/A | Workspace + task tools | Manual software team |
| `examples/agent_team/event_driven/run_software_engineering_team.py` | `examples/agent_team/event_driven/run_software_engineering_team.ts` | Completed | N/A | N/A | N/A | N/A | Workspace + task tools | Event-driven software team |
| `examples/agent_team/manual_notification/prompts/software_engineering/coordinator.prompt` | `examples/agent_team/manual_notification/prompts/software_engineering/coordinator.prompt` | Completed | N/A | N/A | N/A | N/A | None | Prompt file copied |
| `examples/agent_team/manual_notification/prompts/software_engineering/software_engineer.prompt` | `examples/agent_team/manual_notification/prompts/software_engineering/software_engineer.prompt` | Completed | N/A | N/A | N/A | N/A | None | Prompt file copied |
| `examples/agent_team/manual_notification/prompts/software_engineering/code_reviewer.prompt` | `examples/agent_team/manual_notification/prompts/software_engineering/code_reviewer.prompt` | Completed | N/A | N/A | N/A | N/A | None | Prompt file copied |
| `examples/agent_team/manual_notification/prompts/software_engineering/tester.prompt` | `examples/agent_team/manual_notification/prompts/software_engineering/tester.prompt` | Completed | N/A | N/A | N/A | N/A | None | Prompt file copied |
| `examples/agent_team/event_driven/prompts/software_engineering/coordinator.prompt` | `examples/agent_team/event_driven/prompts/software_engineering/coordinator.prompt` | Completed | N/A | N/A | N/A | N/A | None | Prompt file copied |
| `examples/agent_team/event_driven/prompts/software_engineering/software_engineer.prompt` | `examples/agent_team/event_driven/prompts/software_engineering/software_engineer.prompt` | Completed | N/A | N/A | N/A | N/A | None | Prompt file copied |
| `examples/agent_team/event_driven/prompts/software_engineering/code_reviewer.prompt` | `examples/agent_team/event_driven/prompts/software_engineering/code_reviewer.prompt` | Completed | N/A | N/A | N/A | N/A | None | Prompt file copied |
| `examples/agent_team/event_driven/prompts/software_engineering/tester.prompt` | `examples/agent_team/event_driven/prompts/software_engineering/tester.prompt` | Completed | N/A | N/A | N/A | N/A | None | Prompt file copied |
| `examples/mcp/client.py` | N/A | Skipped | N/A | N/A | N/A | N/A | MCP SDK | Standalone MCP client example (non-agent) not migrated |
| `examples/mcp/calculator_server.py` | N/A | Skipped | N/A | N/A | N/A | N/A | MCP SDK | Standalone MCP server example (non-agent) not migrated |
| `examples/run_mcp_list_tools.py` | N/A | Skipped | N/A | N/A | N/A | N/A | MCP registrar | Non-agent MCP inspection example not migrated |
| `examples/run_mcp_browser_client.py` | N/A | Skipped | N/A | N/A | N/A | N/A | MCP SDK | Non-agent MCP client example not migrated |
| `examples/run_mcp_google_slides_client.py` | N/A | Skipped | N/A | N/A | N/A | N/A | MCP SDK | Non-agent MCP client example not migrated |
| N/A | `examples/README.md` | Completed | N/A | N/A | N/A | N/A | None | TS examples usage guide |
| N/A | `tsconfig.examples.json` | Completed | N/A | N/A | N/A | N/A | tsc | Build config for TS examples |
| N/A | `examples/shared/logging.ts` | Completed | N/A | N/A | N/A | N/A | None | Console log-level helper for examples |

## Skills Module

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/skills/model.py` | `src/skills/model.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | None | Skill data model |
| `autobyteus/skills/loader.py` | `src/skills/loader.ts` | Completed | Created | 2026-01-28 Passed | Created | 2026-01-27 Passed | fs, path | SKILL.md loader + parser |
| `autobyteus/skills/registry.py` | `src/skills/registry.ts` | Completed | Created | 2026-01-28 Passed | Created | 2026-01-27 Passed | Singleton | Skill registry + discovery |
| `autobyteus/tools/skill/load_skill.py` | `src/tools/skill/load_skill.ts` | Completed | Created | 2026-01-28 Passed | Created | 2026-01-27 Passed | SkillRegistry | load_skill tool (functional) |

## Task Management

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/task_management/schemas/task_definition.py` | `src/task_management/schemas/task_definition.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | zod | Zod schemas with unique task name check |
| `autobyteus/task_management/schemas/todo_definition.py` | `src/task_management/schemas/todo_definition.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | zod | To-do schema parity |
| `autobyteus/task_management/schemas/deliverable_schema.py` | `src/task_management/schemas/deliverable_schema.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | zod | File deliverable schema parity |
| `autobyteus/task_management/deliverable.py` | `src/task_management/deliverable.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | zod | File deliverable model (timestamp default) |
| `autobyteus/task_management/deliverables/file_deliverable.py` | `src/task_management/deliverables/file_deliverable.ts` | Completed | N/A | N/A | N/A | N/A | None | Re-export of FileDeliverable model |
| `autobyteus/task_management/deliverables/__init__.py` | `src/task_management/deliverables/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Re-exports deliverable helpers |
| `autobyteus/task_management/task.py` | `src/task_management/task.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | zod | Task schema + legacy field compatibility |
| `autobyteus/task_management/base_task_plan.py` | `src/task_management/base_task_plan.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | events | Base plan abstraction + TaskStatus enum |
| `autobyteus/task_management/in_memory_task_plan.py` | `src/task_management/in_memory_task_plan.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | EventType, Task | In-memory task plan + events |
| `autobyteus/task_management/converters/task_plan_converter.py` | `src/task_management/converters/task_plan_converter.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | BaseTaskPlan, TaskStatusReport | Task plan → status report converter |
| `autobyteus/task_management/converters/__init__.py` | `src/task_management/converters/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Re-export converter(s) |
| `autobyteus/task_management/schemas/task_status_report.py` | `src/task_management/schemas/task_status_report.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | zod | Status report schemas |
| `autobyteus/task_management/schemas/__init__.py` | `src/task_management/schemas/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Schema re-exports |
| `autobyteus/task_management/events.py` | `src/task_management/events.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | zod | Task plan event payload schemas |
| `autobyteus/task_management/todo.py` | `src/task_management/todo.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | zod | ToDo model + status enum |
| `autobyteus/task_management/todo_list.py` | `src/task_management/todo_list.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | ToDoDefinitionSchema | In-memory ToDo list |
| `autobyteus/task_management/__init__.py` | `src/task_management/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Module export barrel + TaskPlan alias |

## Task Management Tools

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/task_management/tools/task_tools/create_tasks.py` | `src/task_management/tools/task_tools/create_tasks.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | Tooling, TaskPlan | Create multiple tasks |
| `autobyteus/task_management/tools/task_tools/create_task.py` | `src/task_management/tools/task_tools/create_task.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | Tooling, TaskPlan | Create a single task |
| `autobyteus/task_management/tools/task_tools/update_task_status.py` | `src/task_management/tools/task_tools/update_task_status.ts` | Completed | Created | 2026-01-28 Passed | Deferred | Deferred | TaskPlan, Deliverables | Integration test depends on streaming parser |
| `autobyteus/task_management/tools/task_tools/get_task_plan_status.py` | `src/task_management/tools/task_tools/get_task_plan_status.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | TaskPlanConverter | Task plan JSON status snapshot |
| `autobyteus/task_management/tools/task_tools/get_my_tasks.py` | `src/task_management/tools/task_tools/get_my_tasks.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | TaskPlan | Agent queued-task list |
| `autobyteus/task_management/tools/task_tools/assign_task_to.py` | `src/task_management/tools/task_tools/assign_task_to.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | TaskPlan, TeamManager | Assign task and notify assignee |
| `autobyteus/task_management/tools/task_tools/__init__.py` | `src/task_management/tools/task_tools/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Re-exports task tool classes |
| `autobyteus/task_management/tools/todo_tools/create_todo_list.py` | `src/task_management/tools/todo_tools/create_todo_list.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | ToDoList | Create/overwrite personal to-do list |
| `autobyteus/task_management/tools/todo_tools/add_todo.py` | `src/task_management/tools/todo_tools/add_todo.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | ToDoList | Add item to to-do list |
| `autobyteus/task_management/tools/todo_tools/get_todo_list.py` | `src/task_management/tools/todo_tools/get_todo_list.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | ToDoList | Read personal to-do list |
| `autobyteus/task_management/tools/todo_tools/update_todo_status.py` | `src/task_management/tools/todo_tools/update_todo_status.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | ToDoList | Update to-do status |
| `autobyteus/task_management/tools/todo_tools/__init__.py` | `src/task_management/tools/todo_tools/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Re-exports to-do tool classes |
| `autobyteus/task_management/tools/__init__.py` | `src/task_management/tools/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Re-exports task and to-do tools |

## Multimedia Core

| Original Python File | Target Node.js File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus/multimedia/providers.py` | `src/multimedia/providers.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | None | Multimedia provider enum (+ AUTOBYTEUS for discovery) |
| `autobyteus/multimedia/runtimes.py` | `src/multimedia/runtimes.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | None | Multimedia runtime enum |
| `autobyteus/multimedia/utils/response_types.py` | `src/multimedia/utils/response_types.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | None | Image/audio response containers |
| `autobyteus/multimedia/utils/multimedia_config.py` | `src/multimedia/utils/multimedia_config.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | None | Config params container |
| `autobyteus/multimedia/utils/api_utils.py` | `src/multimedia/utils/api_utils.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | axios, fs | Image loader returns Buffer |
| `autobyteus/multimedia/utils/__init__.py` | `src/multimedia/utils/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Utils barrel exports |
| `autobyteus/multimedia/audio/base_audio_client.py` | `src/multimedia/audio/base_audio_client.ts` | Completed | N/A | N/A | N/A | N/A | None | Abstract audio client base |
| `autobyteus/multimedia/image/base_image_client.py` | `src/multimedia/image/base_image_client.ts` | Completed | N/A | N/A | N/A | N/A | None | Abstract image client base |
| `autobyteus/multimedia/audio/audio_model.py` | `src/multimedia/audio/audio_model.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | ParameterSchema, MultimediaConfig | Audio model metadata + defaults |
| `autobyteus/multimedia/image/image_model.py` | `src/multimedia/image/image_model.ts` | Completed | Created | 2026-01-28 Passed | N/A | N/A | ParameterSchema, MultimediaConfig | Image model metadata + defaults |
| `autobyteus/multimedia/audio/api/openai_audio_client.py` | `src/multimedia/audio/api/openai_audio_client.ts` | Completed | Created | 2026-01-28 Passed | Created | 2026-01-27 Passed | openai | Integration tests pass with OPENAI_API_KEY |
| `autobyteus/multimedia/audio/api/gemini_audio_client.py` | `src/multimedia/audio/api/gemini_audio_client.ts` | Completed | Created | 2026-01-28 Passed | Created | 2026-01-27 Passed | @google/genai | Integration tests pass with GEMINI_API_KEY or Vertex |
| `autobyteus/multimedia/audio/api/autobyteus_audio_client.py` | `src/multimedia/audio/api/autobyteus_audio_client.ts` | Completed | Created | 2026-01-28 Passed | Deferred | 2026-01-27 Skipped | AutobyteusClient | Integration gated by AUTOBYTEUS_RUN_CLIENT_TESTS; server may return 500 |
| `autobyteus/multimedia/audio/autobyteus_audio_provider.py` | `src/multimedia/audio/autobyteus_audio_provider.ts` | Completed | N/A | N/A | Created | 2026-01-27 Passed | AutobyteusClient | Integration tests hit Autobyteus model discovery |
| `autobyteus/multimedia/image/api/openai_image_client.py` | `src/multimedia/image/api/openai_image_client.ts` | Completed | Created | 2026-01-28 Passed | Created | 2026-01-27 Passed | openai | Integration tests pass with OPENAI_API_KEY |
| `autobyteus/multimedia/image/api/gemini_image_client.py` | `src/multimedia/image/api/gemini_image_client.ts` | Completed | Created | 2026-01-28 Passed | Created | 2026-01-27 Passed | @google/genai, mime-types | Input-image integration test skipped under Vertex runtime |
| `autobyteus/multimedia/image/api/autobyteus_image_client.py` | `src/multimedia/image/api/autobyteus_image_client.ts` | Completed | Created | 2026-01-28 Passed | Deferred | 2026-01-27 Skipped | AutobyteusClient | Integration gated by AUTOBYTEUS_RUN_CLIENT_TESTS; timeouts possible |
| `autobyteus/multimedia/image/autobyteus_image_provider.py` | `src/multimedia/image/autobyteus_image_provider.ts` | Completed | N/A | N/A | Created | 2026-01-27 Passed | AutobyteusClient | Integration tests hit Autobyteus model discovery |
| `autobyteus/multimedia/audio/audio_client_factory.py` | `src/multimedia/audio/audio_client_factory.ts` | Completed | Created | 2026-01-28 Passed | Deferred | Deferred | OpenAI/Gemini clients | Autobyteus server discovery deferred |
| `autobyteus/multimedia/image/image_client_factory.py` | `src/multimedia/image/image_client_factory.ts` | Completed | Created | 2026-01-28 Passed | Deferred | Deferred | OpenAI/Gemini clients | Autobyteus server discovery deferred |
| `autobyteus/multimedia/audio/api/__init__.py` | `src/multimedia/audio/api/index.ts` | Completed | N/A | N/A | N/A | N/A | None | API client exports (Autobyteus client deferred) |
| `autobyteus/multimedia/image/api/__init__.py` | `src/multimedia/image/api/index.ts` | Completed | N/A | N/A | N/A | N/A | None | API client exports (Autobyteus client deferred) |
| `autobyteus/multimedia/audio/__init__.py` | `src/multimedia/audio/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Audio module exports |
| `autobyteus/multimedia/image/__init__.py` | `src/multimedia/image/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Image module exports |
| `autobyteus/multimedia/__init__.py` | `src/multimedia/index.ts` | Completed | N/A | N/A | N/A | N/A | None | Exports audio/image modules; Autobyteus clients still deferred |

## Deferred Decisions

| Area | Decision Needed | Status | Notes |
| --------------------------- | ------------------------------------------------- | -------- | --------------------------------------------------------------------- |
| Tool auto-registration | Where/when built-in tools register in Node.js | Deferred | Prefer framework bootstrap/composition root; revisit after tool catalog migration |
| Browser tools (brui_core) | Whether to migrate or externalize to MCP | Deferred | Do not migrate; externalize to MCP instead |
| Operation/transaction stack | Whether to migrate legacy operation handlers | Deferred | Appears unused; ShellHandler expects `.command` but ShellOperation passes string, JournalManager references `operation.transaction_id` (missing), BackupHandler uses undefined logger, mixed import roots |
