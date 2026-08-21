import { z } from "zod";
export declare const teamAgentSegmentTypeSchema: z.ZodEnum<{
    text: "text";
    tool_call: "tool_call";
    write_file: "write_file";
    edit_file: "edit_file";
    run_bash: "run_bash";
    reasoning: "reasoning";
    media: "media";
}>;
export declare const teamAgentPayloadSchemas: {
    readonly SYSTEM_INSTRUCTIONS_SUPPLIED: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        trace_id: z.ZodString;
        content: z.ZodString;
        ts: z.ZodNumber;
    }, z.core.$strict>;
    readonly TURN_STARTED: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    readonly TURN_COMPLETED: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
        reason: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    readonly TURN_INTERRUPTED: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
        reason: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    readonly SEGMENT_START: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
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
    readonly SEGMENT_CONTENT: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
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
    readonly SEGMENT_END: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        segment_id: z.ZodString;
        turn_id: z.ZodString;
        metadata: z.ZodNullable<z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>>;
        interrupted: z.ZodBoolean;
        reason: z.ZodNullable<z.ZodString>;
        failed: z.ZodBoolean;
        error: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    readonly AGENT_STATUS: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
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
    readonly COMPACTION_STATUS: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
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
    readonly TOKEN_USAGE_UPDATED: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
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
            mixed: "mixed";
            local_no_api_bill: "local_no_api_bill";
            estimated: "estimated";
            price_missing: "price_missing";
            partial_price_missing: "partial_price_missing";
        }>;
        missing_price_dimensions: z.ZodArray<z.ZodString>;
        pricing_policy_key: z.ZodNullable<z.ZodString>;
        selected_pricing_tier_id: z.ZodNullable<z.ZodString>;
        latest_prompt_tokens: z.ZodNullable<z.ZodNumber>;
        effective_context_window_tokens: z.ZodNullable<z.ZodNumber>;
        context_window_usage_percent: z.ZodNullable<z.ZodNumber>;
        run_summary_after_event: z.ZodNullable<z.ZodObject<{
            run_id: z.ZodString;
            root_team_run_id: z.ZodNullable<z.ZodString>;
            agent_definition_id: z.ZodNullable<z.ZodString>;
            workspace_id: z.ZodNullable<z.ZodString>;
            gross_input_tokens: z.ZodNumber;
            standard_input_tokens: z.ZodNumber;
            cache_miss_input_tokens: z.ZodNumber;
            cache_read_input_tokens: z.ZodNumber;
            cache_creation_input_tokens: z.ZodNumber;
            cache_creation_5m_input_tokens: z.ZodNumber;
            cache_creation_1h_input_tokens: z.ZodNumber;
            output_tokens: z.ZodNumber;
            reasoning_output_tokens: z.ZodNumber;
            billable_output_tokens: z.ZodNumber;
            total_tokens: z.ZodNumber;
            cache_read_input_token_rate: z.ZodNullable<z.ZodNumber>;
            standard_input_token_rate: z.ZodNullable<z.ZodNumber>;
            cache_creation_input_token_rate: z.ZodNullable<z.ZodNumber>;
            cache_state: z.ZodEnum<{
                unknown: "unknown";
                positive: "positive";
                zero_reported: "zero_reported";
                not_reported: "not_reported";
                unsupported_or_local: "unsupported_or_local";
            }>;
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
                mixed: "mixed";
                local_no_api_bill: "local_no_api_bill";
                estimated: "estimated";
                price_missing: "price_missing";
                partial_price_missing: "partial_price_missing";
            }>;
            missing_price_dimensions: z.ZodArray<z.ZodString>;
            pricing_policy_key: z.ZodNullable<z.ZodString>;
            selected_pricing_tier_id: z.ZodNullable<z.ZodString>;
            unit_prices: z.ZodObject<{
                standard_input: z.ZodObject<{
                    status: z.ZodEnum<{
                        single: "single";
                        mixed: "mixed";
                        missing: "missing";
                        partial_missing: "partial_missing";
                        not_applicable: "not_applicable";
                        local_no_api_bill: "local_no_api_bill";
                    }>;
                    price_per_million: z.ZodNullable<z.ZodNumber>;
                }, z.core.$strict>;
                cache_read_input: z.ZodObject<{
                    status: z.ZodEnum<{
                        single: "single";
                        mixed: "mixed";
                        missing: "missing";
                        partial_missing: "partial_missing";
                        not_applicable: "not_applicable";
                        local_no_api_bill: "local_no_api_bill";
                    }>;
                    price_per_million: z.ZodNullable<z.ZodNumber>;
                }, z.core.$strict>;
                cache_creation_input: z.ZodObject<{
                    status: z.ZodEnum<{
                        single: "single";
                        mixed: "mixed";
                        missing: "missing";
                        partial_missing: "partial_missing";
                        not_applicable: "not_applicable";
                        local_no_api_bill: "local_no_api_bill";
                    }>;
                    price_per_million: z.ZodNullable<z.ZodNumber>;
                }, z.core.$strict>;
                cache_creation_5m_input: z.ZodObject<{
                    status: z.ZodEnum<{
                        single: "single";
                        mixed: "mixed";
                        missing: "missing";
                        partial_missing: "partial_missing";
                        not_applicable: "not_applicable";
                        local_no_api_bill: "local_no_api_bill";
                    }>;
                    price_per_million: z.ZodNullable<z.ZodNumber>;
                }, z.core.$strict>;
                cache_creation_1h_input: z.ZodObject<{
                    status: z.ZodEnum<{
                        single: "single";
                        mixed: "mixed";
                        missing: "missing";
                        partial_missing: "partial_missing";
                        not_applicable: "not_applicable";
                        local_no_api_bill: "local_no_api_bill";
                    }>;
                    price_per_million: z.ZodNullable<z.ZodNumber>;
                }, z.core.$strict>;
                output: z.ZodObject<{
                    status: z.ZodEnum<{
                        single: "single";
                        mixed: "mixed";
                        missing: "missing";
                        partial_missing: "partial_missing";
                        not_applicable: "not_applicable";
                        local_no_api_bill: "local_no_api_bill";
                    }>;
                    price_per_million: z.ZodNullable<z.ZodNumber>;
                }, z.core.$strict>;
                reasoning_output: z.ZodObject<{
                    status: z.ZodEnum<{
                        single: "single";
                        mixed: "mixed";
                        missing: "missing";
                        partial_missing: "partial_missing";
                        not_applicable: "not_applicable";
                        local_no_api_bill: "local_no_api_bill";
                    }>;
                    price_per_million: z.ZodNullable<z.ZodNumber>;
                }, z.core.$strict>;
            }, z.core.$strict>;
            latest_prompt_tokens: z.ZodNullable<z.ZodNumber>;
            effective_context_window_tokens: z.ZodNullable<z.ZodNumber>;
            context_window_usage_percent: z.ZodNullable<z.ZodNumber>;
            latest_model_provider: z.ZodNullable<z.ZodString>;
            latest_model_identifier: z.ZodNullable<z.ZodString>;
            latest_runtime_kind: z.ZodNullable<z.ZodString>;
            usage_report_count: z.ZodNumber;
            updated_at: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>>;
        quality_flags: z.ZodArray<z.ZodString>;
    }, z.core.$strict>;
    readonly ASSISTANT_COMPLETE: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        content: z.ZodNullable<z.ZodString>;
        reasoning: z.ZodNullable<z.ZodString>;
        usage: z.ZodNullable<z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>>;
        image_urls: z.ZodArray<z.ZodString>;
        audio_urls: z.ZodArray<z.ZodString>;
        video_urls: z.ZodArray<z.ZodString>;
    }, z.core.$strict>;
    readonly TOOL_APPROVAL_REQUESTED: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        arguments: z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>;
        invocation_id: z.ZodString;
        tool_name: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    readonly TOOL_APPROVED: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        reason: z.ZodNullable<z.ZodString>;
        invocation_id: z.ZodString;
        tool_name: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    readonly TOOL_DENIED: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        arguments: z.ZodNullable<z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>>;
        reason: z.ZodNullable<z.ZodString>;
        error: z.ZodNullable<z.ZodString>;
        invocation_id: z.ZodString;
        tool_name: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    readonly TOOL_EXECUTION_STARTED: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        arguments: z.ZodNullable<z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>>;
        invocation_id: z.ZodString;
        tool_name: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    readonly TOOL_EXECUTION_SUCCEEDED: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        arguments: z.ZodNullable<z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>>;
        result: z.ZodNullable<z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>>;
        invocation_id: z.ZodString;
        tool_name: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    readonly TOOL_EXECUTION_FAILED: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        arguments: z.ZodNullable<z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>>;
        error: z.ZodString;
        invocation_id: z.ZodString;
        tool_name: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    readonly TOOL_EXECUTION_INTERRUPTED: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        arguments: z.ZodNullable<z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>>;
        reason: z.ZodString;
        invocation_id: z.ZodString;
        tool_name: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    readonly TOOL_LOG: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        log_entry: z.ZodString;
        tool_invocation_id: z.ZodString;
        tool_name: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    readonly TODO_LIST_UPDATE: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
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
    readonly SYSTEM_TASK_NOTIFICATION: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        sender: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"system">;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"execution">;
            identity: z.ZodObject<{
                agent_run_id: z.ZodString;
                member_address: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>]>;
        content: z.ZodString;
    }, z.core.$strict>;
    readonly ARTIFACT_PERSISTED: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        artifact_id: z.ZodString;
        path: z.ZodString;
        artifact_type: z.ZodString;
        status: z.ZodLiteral<"available">;
        description: z.ZodNullable<z.ZodString>;
        revision_id: z.ZodString;
        created_at: z.ZodString;
        updated_at: z.ZodString;
    }, z.core.$strict>;
    readonly FILE_CHANGE: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
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
};
export declare const teamAgentErrorPayloadSchema: z.ZodUnion<readonly [z.ZodObject<{
    error_scope: z.ZodNull;
    error_effect: z.ZodNull;
    turn_id: z.ZodNull;
    code: z.ZodString;
    message: z.ZodString;
    change_sequence: z.ZodNullable<z.ZodNumber>;
    agent_run_id: z.ZodNullable<z.ZodString>;
}, z.core.$strict>, z.ZodObject<{
    error_scope: z.ZodLiteral<"turn">;
    error_effect: z.ZodEnum<{
        diagnostic: "diagnostic";
        terminal: "terminal";
    }>;
    turn_id: z.ZodString;
    code: z.ZodString;
    message: z.ZodString;
    change_sequence: z.ZodNullable<z.ZodNumber>;
    agent_run_id: z.ZodNullable<z.ZodString>;
}, z.core.$strict>, z.ZodObject<{
    error_scope: z.ZodLiteral<"runtime">;
    error_effect: z.ZodLiteral<"terminal">;
    turn_id: z.ZodNull;
    code: z.ZodString;
    message: z.ZodString;
    change_sequence: z.ZodNullable<z.ZodNumber>;
    agent_run_id: z.ZodNullable<z.ZodString>;
}, z.core.$strict>]>;
export declare const teamInterruptCommandAckPayloadSchema: z.ZodUnion<readonly [z.ZodObject<{
    command_type: z.ZodLiteral<"INTERRUPT_GENERATION">;
    command_id: z.ZodString;
    state: z.ZodLiteral<"accepted">;
    agent_run_id: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    command_type: z.ZodLiteral<"INTERRUPT_GENERATION">;
    command_id: z.ZodString;
    state: z.ZodEnum<{
        failed: "failed";
        rejected: "rejected";
    }>;
    code: z.ZodString;
    message: z.ZodString;
    agent_run_id: z.ZodString;
}, z.core.$strict>]>;
export type TeamAgentMessageType = keyof typeof teamAgentPayloadSchemas;
export type TeamAgentPayload<T extends TeamAgentMessageType> = Readonly<z.infer<(typeof teamAgentPayloadSchemas)[T]>>;
//# sourceMappingURL=team-agent-message-dtos.d.ts.map