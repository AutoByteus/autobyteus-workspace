import { z } from "zod";
import { teamAgentErrorPayloadSchema, teamAgentPayloadSchemas, teamInterruptCommandAckPayloadSchema, type TeamAgentMessageType } from "./team-agent-message-dtos.js";
import { teamCommunicationMessagePayloadSchema, teamExternalUserMessagePayloadSchema, teamMemberInputMessagePayloadSchema } from "./team-collaboration-message-dtos.js";
import { teamConnectedPayloadSchema, teamRunLifecyclePayloadSchema } from "./team-control-message-dtos.js";
import { teamTaskDelegationPayloadSchema } from "./team-task-message-dtos.js";
export declare const teamStreamServerMessageSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"TURN_STARTED">;
    payload: z.ZodObject<{
        agent_execution: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"persistent_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_team_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            agent_run_id: z.ZodString;
        }, z.core.$strict>]>;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TURN_COMPLETED">;
    payload: z.ZodObject<{
        agent_execution: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"persistent_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_team_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            agent_run_id: z.ZodString;
        }, z.core.$strict>]>;
        turn_id: z.ZodNullable<z.ZodString>;
        reason: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TURN_INTERRUPTED">;
    payload: z.ZodObject<{
        agent_execution: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"persistent_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_team_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            agent_run_id: z.ZodString;
        }, z.core.$strict>]>;
        turn_id: z.ZodNullable<z.ZodString>;
        reason: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"SEGMENT_START">;
    payload: z.ZodObject<{
        agent_execution: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"persistent_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_team_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            agent_run_id: z.ZodString;
        }, z.core.$strict>]>;
        segment_id: z.ZodString;
        turn_id: z.ZodString;
        segment_type: z.ZodEnum<{
            text: "text";
            tool_call: "tool_call";
            write_file: "write_file";
            edit_file: "edit_file";
            run_bash: "run_bash";
            reasoning: "reasoning";
            media: "media";
        }>;
        metadata: z.ZodNullable<z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"SEGMENT_CONTENT">;
    payload: z.ZodObject<{
        agent_execution: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"persistent_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_team_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            agent_run_id: z.ZodString;
        }, z.core.$strict>]>;
        segment_id: z.ZodString;
        turn_id: z.ZodString;
        segment_type: z.ZodEnum<{
            text: "text";
            tool_call: "tool_call";
            write_file: "write_file";
            edit_file: "edit_file";
            run_bash: "run_bash";
            reasoning: "reasoning";
            media: "media";
        }>;
        delta: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"SEGMENT_END">;
    payload: z.ZodObject<{
        agent_execution: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"persistent_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_team_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            agent_run_id: z.ZodString;
        }, z.core.$strict>]>;
        segment_id: z.ZodString;
        turn_id: z.ZodString;
        metadata: z.ZodNullable<z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>>;
        interrupted: z.ZodBoolean;
        reason: z.ZodNullable<z.ZodString>;
        failed: z.ZodBoolean;
        error: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"AGENT_STATUS">;
    payload: z.ZodObject<{
        agent_execution: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"persistent_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_team_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            agent_run_id: z.ZodString;
        }, z.core.$strict>]>;
        status: z.ZodEnum<{
            error: "error";
            offline: "offline";
            initializing: "initializing";
            idle: "idle";
            running: "running";
        }>;
        trigger: z.ZodNullable<z.ZodString>;
        tool_name: z.ZodNullable<z.ZodString>;
        error_message: z.ZodNullable<z.ZodString>;
        error_details: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"COMPACTION_STATUS">;
    payload: z.ZodObject<{
        agent_execution: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"persistent_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_team_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            agent_run_id: z.ZodString;
        }, z.core.$strict>]>;
        phase: z.ZodNullable<z.ZodString>;
        kind: z.ZodNullable<z.ZodString>;
        status: z.ZodNullable<z.ZodString>;
        turn_id: z.ZodNullable<z.ZodString>;
        compaction_operation_id: z.ZodNullable<z.ZodString>;
        requested_turn_id: z.ZodNullable<z.ZodString>;
        execution_turn_id: z.ZodNullable<z.ZodString>;
        selected_block_count: z.ZodNullable<z.ZodNumber>;
        compacted_block_count: z.ZodNullable<z.ZodNumber>;
        raw_trace_count: z.ZodNullable<z.ZodNumber>;
        semantic_fact_count: z.ZodNullable<z.ZodNumber>;
        compaction_agent_definition_id: z.ZodNullable<z.ZodString>;
        compaction_agent_name: z.ZodNullable<z.ZodString>;
        compaction_runtime_kind: z.ZodNullable<z.ZodString>;
        compaction_model_identifier: z.ZodNullable<z.ZodString>;
        compaction_run_id: z.ZodNullable<z.ZodString>;
        compaction_task_id: z.ZodNullable<z.ZodString>;
        error_message: z.ZodNullable<z.ZodString>;
        provider: z.ZodNullable<z.ZodString>;
        source_surface: z.ZodNullable<z.ZodString>;
        boundary_key: z.ZodNullable<z.ZodString>;
        provider_event_id: z.ZodNullable<z.ZodString>;
        provider_session_id: z.ZodNullable<z.ZodString>;
        provider_thread_id: z.ZodNullable<z.ZodString>;
        provider_timestamp: z.ZodNullable<z.ZodNumber>;
        trigger: z.ZodNullable<z.ZodString>;
        pre_tokens: z.ZodNullable<z.ZodNumber>;
        rotation_eligible: z.ZodNullable<z.ZodBoolean>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TOKEN_USAGE_UPDATED">;
    payload: z.ZodObject<{
        agent_execution: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"persistent_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_team_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            agent_run_id: z.ZodString;
        }, z.core.$strict>]>;
        usage_event_id: z.ZodString;
        idempotency_key: z.ZodString;
        observed_at: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
        llm_call_id: z.ZodNullable<z.ZodString>;
        model_provider: z.ZodNullable<z.ZodString>;
        model_identifier: z.ZodNullable<z.ZodString>;
        model_value: z.ZodNullable<z.ZodString>;
        usage_scope: z.ZodEnum<{
            per_call: "per_call";
            per_turn: "per_turn";
            cumulative_snapshot: "cumulative_snapshot";
        }>;
        input_token_semantic: z.ZodEnum<{
            unknown: "unknown";
            gross_includes_cache: "gross_includes_cache";
            base_excludes_cache: "base_excludes_cache";
        }>;
        standard_input_tokens: z.ZodNullable<z.ZodNumber>;
        cache_miss_input_tokens: z.ZodNullable<z.ZodNumber>;
        cache_read_input_tokens: z.ZodNullable<z.ZodNumber>;
        cache_creation_input_tokens: z.ZodNullable<z.ZodNumber>;
        cache_creation_5m_input_tokens: z.ZodNullable<z.ZodNumber>;
        cache_creation_1h_input_tokens: z.ZodNullable<z.ZodNumber>;
        cache_state: z.ZodEnum<{
            unknown: "unknown";
            positive: "positive";
            zero_reported: "zero_reported";
            not_reported: "not_reported";
            unsupported_or_local: "unsupported_or_local";
        }>;
        reasoning_output_tokens: z.ZodNullable<z.ZodNumber>;
        billable_output_tokens: z.ZodNullable<z.ZodNumber>;
        meter_delta_input_tokens: z.ZodNullable<z.ZodNumber>;
        meter_delta_output_tokens: z.ZodNullable<z.ZodNumber>;
        meter_delta_total_tokens: z.ZodNullable<z.ZodNumber>;
        input_price_per_million: z.ZodNullable<z.ZodNumber>;
        output_price_per_million: z.ZodNullable<z.ZodNumber>;
        cached_input_read_price_per_million: z.ZodNullable<z.ZodNumber>;
        cached_input_write_price_per_million: z.ZodNullable<z.ZodNumber>;
        cached_input_write_5m_price_per_million: z.ZodNullable<z.ZodNumber>;
        cached_input_write_1h_price_per_million: z.ZodNullable<z.ZodNumber>;
        estimated_api_input_cost: z.ZodNullable<z.ZodNumber>;
        estimated_api_standard_input_cost: z.ZodNullable<z.ZodNumber>;
        estimated_api_cache_read_input_cost: z.ZodNullable<z.ZodNumber>;
        estimated_api_cache_creation_input_cost: z.ZodNullable<z.ZodNumber>;
        estimated_api_cache_creation_5m_input_cost: z.ZodNullable<z.ZodNumber>;
        estimated_api_cache_creation_1h_input_cost: z.ZodNullable<z.ZodNumber>;
        estimated_api_output_cost: z.ZodNullable<z.ZodNumber>;
        estimated_api_reasoning_output_cost: z.ZodNullable<z.ZodNumber>;
        estimated_api_total_cost: z.ZodNullable<z.ZodNumber>;
        currency: z.ZodNullable<z.ZodString>;
        api_cost_status: z.ZodEnum<{
            estimated: "estimated";
            price_missing: "price_missing";
            partial_price_missing: "partial_price_missing";
            mixed: "mixed";
            local_no_api_bill: "local_no_api_bill";
        }>;
        missing_price_dimensions: z.ZodArray<z.ZodString>;
        pricing_policy_key: z.ZodNullable<z.ZodString>;
        selected_pricing_tier_id: z.ZodNullable<z.ZodString>;
        latest_prompt_tokens: z.ZodNullable<z.ZodNumber>;
        effective_context_window_tokens: z.ZodNullable<z.ZodNumber>;
        context_window_usage_percent: z.ZodNullable<z.ZodNumber>;
        quality_flags: z.ZodArray<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"ASSISTANT_COMPLETE">;
    payload: z.ZodObject<{
        agent_execution: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"persistent_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_team_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            agent_run_id: z.ZodString;
        }, z.core.$strict>]>;
        content: z.ZodNullable<z.ZodString>;
        reasoning: z.ZodNullable<z.ZodString>;
        usage: z.ZodNullable<z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>>;
        image_urls: z.ZodArray<z.ZodString>;
        audio_urls: z.ZodArray<z.ZodString>;
        video_urls: z.ZodArray<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TOOL_APPROVAL_REQUESTED">;
    payload: z.ZodObject<{
        agent_execution: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"persistent_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_team_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            agent_run_id: z.ZodString;
        }, z.core.$strict>]>;
        arguments: z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>;
        invocation_id: z.ZodString;
        tool_name: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TOOL_APPROVED">;
    payload: z.ZodObject<{
        agent_execution: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"persistent_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_team_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            agent_run_id: z.ZodString;
        }, z.core.$strict>]>;
        reason: z.ZodNullable<z.ZodString>;
        invocation_id: z.ZodString;
        tool_name: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TOOL_DENIED">;
    payload: z.ZodObject<{
        agent_execution: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"persistent_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_team_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            agent_run_id: z.ZodString;
        }, z.core.$strict>]>;
        arguments: z.ZodNullable<z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>>;
        reason: z.ZodNullable<z.ZodString>;
        error: z.ZodNullable<z.ZodString>;
        invocation_id: z.ZodString;
        tool_name: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TOOL_EXECUTION_STARTED">;
    payload: z.ZodObject<{
        agent_execution: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"persistent_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_team_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            agent_run_id: z.ZodString;
        }, z.core.$strict>]>;
        arguments: z.ZodNullable<z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>>;
        invocation_id: z.ZodString;
        tool_name: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TOOL_EXECUTION_SUCCEEDED">;
    payload: z.ZodObject<{
        agent_execution: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"persistent_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_team_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            agent_run_id: z.ZodString;
        }, z.core.$strict>]>;
        arguments: z.ZodNullable<z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>>;
        result: z.ZodNullable<z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>>;
        invocation_id: z.ZodString;
        tool_name: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TOOL_EXECUTION_FAILED">;
    payload: z.ZodObject<{
        agent_execution: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"persistent_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_team_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            agent_run_id: z.ZodString;
        }, z.core.$strict>]>;
        arguments: z.ZodNullable<z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>>;
        error: z.ZodString;
        invocation_id: z.ZodString;
        tool_name: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TOOL_EXECUTION_INTERRUPTED">;
    payload: z.ZodObject<{
        agent_execution: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"persistent_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_team_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            agent_run_id: z.ZodString;
        }, z.core.$strict>]>;
        arguments: z.ZodNullable<z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>>;
        reason: z.ZodString;
        invocation_id: z.ZodString;
        tool_name: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TOOL_LOG">;
    payload: z.ZodObject<{
        agent_execution: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"persistent_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_team_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            agent_run_id: z.ZodString;
        }, z.core.$strict>]>;
        log_entry: z.ZodString;
        tool_invocation_id: z.ZodString;
        tool_name: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TODO_LIST_UPDATE">;
    payload: z.ZodObject<{
        agent_execution: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"persistent_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_team_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            agent_run_id: z.ZodString;
        }, z.core.$strict>]>;
        todos: z.ZodArray<z.ZodObject<{
            todo_id: z.ZodString;
            description: z.ZodString;
            status: z.ZodEnum<{
                pending: "pending";
                in_progress: "in_progress";
                done: "done";
            }>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"SYSTEM_TASK_NOTIFICATION">;
    payload: z.ZodObject<{
        agent_execution: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"persistent_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_team_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            agent_run_id: z.ZodString;
        }, z.core.$strict>]>;
        sender: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"system">;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"execution">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>]>;
        content: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"ARTIFACT_PERSISTED">;
    payload: z.ZodObject<{
        agent_execution: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"persistent_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_team_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            agent_run_id: z.ZodString;
        }, z.core.$strict>]>;
        artifact_id: z.ZodString;
        path: z.ZodString;
        artifact_type: z.ZodString;
        status: z.ZodLiteral<"available">;
        description: z.ZodNullable<z.ZodString>;
        revision_id: z.ZodString;
        created_at: z.ZodString;
        updated_at: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"FILE_CHANGE">;
    payload: z.ZodObject<{
        agent_execution: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"persistent_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_team_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            agent_run_id: z.ZodString;
        }, z.core.$strict>]>;
        file_change_id: z.ZodString;
        path: z.ZodString;
        file_type: z.ZodString;
        status: z.ZodString;
        source_tool: z.ZodString;
        source_invocation_id: z.ZodNullable<z.ZodString>;
        content: z.ZodNullable<z.ZodString>;
        created_at: z.ZodString;
        updated_at: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"CONNECTED">;
    payload: z.ZodObject<{
        session_id: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TEAM_RUN_LIFECYCLE">;
    payload: z.ZodObject<{
        is_active: z.ZodBoolean;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"AGENT_COMMAND_ACK">;
    payload: z.ZodUnion<readonly [z.ZodObject<{
        command_type: z.ZodLiteral<"INTERRUPT_GENERATION">;
        command_id: z.ZodString;
        state: z.ZodLiteral<"accepted">;
        execution_address: z.ZodObject<{
            root_team_run_id: z.ZodString;
            task_team_run_ids: z.ZodArray<z.ZodString>;
            member_address: z.ZodString;
            task_agent_run_id: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>;
    }, z.core.$strict>, z.ZodObject<{
        command_type: z.ZodLiteral<"INTERRUPT_GENERATION">;
        command_id: z.ZodString;
        state: z.ZodEnum<{
            failed: "failed";
            rejected: "rejected";
        }>;
        code: z.ZodString;
        message: z.ZodString;
        execution_address: z.ZodObject<{
            root_team_run_id: z.ZodString;
            task_team_run_ids: z.ZodArray<z.ZodString>;
            member_address: z.ZodString;
            task_agent_run_id: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>;
    }, z.core.$strict>]>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TASK_DELEGATION_EVENT">;
    payload: z.ZodDiscriminatedUnion<[z.ZodObject<{
        sender_address: z.ZodObject<{
            root_team_run_id: z.ZodString;
            task_team_run_ids: z.ZodArray<z.ZodString>;
            member_address: z.ZodString;
            task_agent_run_id: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>;
        content: z.ZodString;
        reference_files: z.ZodArray<z.ZodObject<{
            reference_id: z.ZodString;
            path: z.ZodString;
            type: z.ZodString;
            created_at: z.ZodString;
            updated_at: z.ZodString;
        }, z.core.$strict>>;
        created_at: z.ZodString;
        started_at: z.ZodString;
        task_id: z.ZodString;
        execution_address: z.ZodObject<{
            root_team_run_id: z.ZodString;
            task_team_run_ids: z.ZodArray<z.ZodString>;
            member_address: z.ZodString;
            task_agent_run_id: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>;
        event_type: z.ZodLiteral<"TASK_DELEGATION_ACTIVATED">;
    }, z.core.$strict>, z.ZodObject<{
        submission_id: z.ZodString;
        submitted_at: z.ZodString;
        task_id: z.ZodString;
        execution_address: z.ZodObject<{
            root_team_run_id: z.ZodString;
            task_team_run_ids: z.ZodArray<z.ZodString>;
            member_address: z.ZodString;
            task_agent_run_id: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>;
        event_type: z.ZodLiteral<"TASK_DELEGATION_RESULT_SUBMITTED">;
    }, z.core.$strict>, z.ZodObject<{
        review_id: z.ZodString;
        reviewed_submission_id: z.ZodString;
        decision: z.ZodEnum<{
            accept: "accept";
            request_revision: "request_revision";
        }>;
        reviewed_at: z.ZodString;
        task_id: z.ZodString;
        execution_address: z.ZodObject<{
            root_team_run_id: z.ZodString;
            task_team_run_ids: z.ZodArray<z.ZodString>;
            member_address: z.ZodString;
            task_agent_run_id: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>;
        event_type: z.ZodLiteral<"TASK_DELEGATION_RESULT_REVIEWED">;
    }, z.core.$strict>], "event_type">;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TEAM_COMMUNICATION_MESSAGE">;
    payload: z.ZodObject<{
        message_id: z.ZodString;
        sender_address: z.ZodObject<{
            root_team_run_id: z.ZodString;
            task_team_run_ids: z.ZodArray<z.ZodString>;
            member_address: z.ZodString;
            task_agent_run_id: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>;
        receiver_address: z.ZodObject<{
            root_team_run_id: z.ZodString;
            task_team_run_ids: z.ZodArray<z.ZodString>;
            member_address: z.ZodString;
            task_agent_run_id: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>;
        content: z.ZodString;
        message_type: z.ZodString;
        reference_files: z.ZodArray<z.ZodObject<{
            reference_id: z.ZodString;
            path: z.ZodString;
            type: z.ZodString;
            created_at: z.ZodString;
            updated_at: z.ZodString;
        }, z.core.$strict>>;
        created_at: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"MEMBER_INPUT_MESSAGE">;
    payload: z.ZodObject<{
        execution_address: z.ZodObject<{
            root_team_run_id: z.ZodString;
            task_team_run_ids: z.ZodArray<z.ZodString>;
            member_address: z.ZodString;
            task_agent_run_id: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>;
        message_id: z.ZodString;
        dedupe_key: z.ZodString;
        content: z.ZodString;
        input_origin: z.ZodEnum<{
            user_message: "user_message";
            inter_agent_delivery: "inter_agent_delivery";
        }>;
        received_at: z.ZodString;
        context_file_paths: z.ZodArray<z.ZodObject<{
            path: z.ZodString;
            type: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>>;
        sender_address: z.ZodNullable<z.ZodObject<{
            root_team_run_id: z.ZodString;
            task_team_run_ids: z.ZodArray<z.ZodString>;
            member_address: z.ZodString;
            task_agent_run_id: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>>;
        parent_communication_message_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"EXTERNAL_USER_MESSAGE">;
    payload: z.ZodObject<{
        execution_address: z.ZodObject<{
            root_team_run_id: z.ZodString;
            task_team_run_ids: z.ZodArray<z.ZodString>;
            member_address: z.ZodString;
            task_agent_run_id: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>;
        content: z.ZodString;
        received_at: z.ZodString;
        provider: z.ZodString;
        transport: z.ZodString;
        account_id: z.ZodString;
        peer_id: z.ZodString;
        thread_id: z.ZodNullable<z.ZodString>;
        external_message_id: z.ZodString;
        context_file_paths: z.ZodArray<z.ZodObject<{
            path: z.ZodString;
            type: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"ERROR">;
    payload: z.ZodUnion<readonly [z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        agent_execution: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"persistent_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task_team_agent">;
            execution_address: z.ZodObject<{
                root_team_run_id: z.ZodString;
                task_team_run_ids: z.ZodArray<z.ZodString>;
                member_address: z.ZodString;
                task_agent_run_id: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            agent_run_id: z.ZodString;
        }, z.core.$strict>]>;
        error_scope: z.ZodNullable<z.ZodEnum<{
            turn: "turn";
            runtime: "runtime";
        }>>;
        error_effect: z.ZodNullable<z.ZodEnum<{
            diagnostic: "diagnostic";
            terminal: "terminal";
        }>>;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        agent_execution: z.ZodNull;
        error_scope: z.ZodNullable<z.ZodEnum<{
            turn: "turn";
            runtime: "runtime";
        }>>;
        error_effect: z.ZodNullable<z.ZodEnum<{
            diagnostic: "diagnostic";
            terminal: "terminal";
        }>>;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>]>;
}, z.core.$strict>], "type">;
type TeamAgentServerMessage = {
    [K in TeamAgentMessageType]: Readonly<{
        type: K;
        payload: Readonly<z.infer<(typeof teamAgentPayloadSchemas)[K]>>;
    }>;
}[TeamAgentMessageType];
export type TeamStreamServerMessage = TeamAgentServerMessage | Readonly<{
    type: "CONNECTED";
    payload: z.infer<typeof teamConnectedPayloadSchema>;
}> | Readonly<{
    type: "TEAM_RUN_LIFECYCLE";
    payload: z.infer<typeof teamRunLifecyclePayloadSchema>;
}> | Readonly<{
    type: "AGENT_COMMAND_ACK";
    payload: z.infer<typeof teamInterruptCommandAckPayloadSchema>;
}> | Readonly<{
    type: "TASK_DELEGATION_EVENT";
    payload: z.infer<typeof teamTaskDelegationPayloadSchema>;
}> | Readonly<{
    type: "TEAM_COMMUNICATION_MESSAGE";
    payload: z.infer<typeof teamCommunicationMessagePayloadSchema>;
}> | Readonly<{
    type: "MEMBER_INPUT_MESSAGE";
    payload: z.infer<typeof teamMemberInputMessagePayloadSchema>;
}> | Readonly<{
    type: "EXTERNAL_USER_MESSAGE";
    payload: z.infer<typeof teamExternalUserMessagePayloadSchema>;
}> | Readonly<{
    type: "ERROR";
    payload: z.infer<typeof teamAgentErrorPayloadSchema>;
}>;
export declare const parseTeamStreamServerMessage: (value: string | unknown) => TeamStreamServerMessage;
export declare const serializeTeamStreamServerMessage: (message: TeamStreamServerMessage) => string;
export {};
//# sourceMappingURL=team-stream-server-message.d.ts.map