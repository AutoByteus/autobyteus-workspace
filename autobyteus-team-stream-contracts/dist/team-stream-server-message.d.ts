import { z } from "zod";
import { teamAgentErrorPayloadSchema, teamAgentPayloadSchemas, teamInterruptCommandAckPayloadSchema, type TeamAgentMessageType } from "./team-agent-message-dtos.js";
import { teamCommunicationMessagePayloadSchema, teamExternalUserMessagePayloadSchema, teamMemberInputMessagePayloadSchema } from "./team-collaboration-message-dtos.js";
import { teamConnectedPayloadSchema, teamRunLifecyclePayloadSchema } from "./team-control-message-dtos.js";
import { teamTaskDelegationPayloadSchema } from "./team-task-message-dtos.js";
export declare const teamExecutionViewSnapshotPayloadSchema: z.ZodObject<{
    root_team_run_id: z.ZodString;
    base_change_sequence: z.ZodNumber;
    execution_tree: z.ZodType<Readonly<{
        schema_version: 1;
        created_at: string;
        archived_at: string | null;
        application_binding: Readonly<{
            application_id: string;
            binding_id: string;
        }> | null;
        handoffs: readonly Readonly<{
            from: string;
            to: string;
            rules: readonly string[];
        }>[];
        root_team: Readonly<{
            team_definition_id: string;
            team_definition_name: string;
            team_run_id: string;
            coordinator_address: string;
            members: readonly import("./team-execution-view-dtos.js").ConfiguredMemberExecutionDto[];
            task_executions: readonly import("./team-execution-view-dtos.js").TaskExecutionDto[];
        }>;
    }>, unknown, z.core.$ZodTypeInternals<Readonly<{
        schema_version: 1;
        created_at: string;
        archived_at: string | null;
        application_binding: Readonly<{
            application_id: string;
            binding_id: string;
        }> | null;
        handoffs: readonly Readonly<{
            from: string;
            to: string;
            rules: readonly string[];
        }>[];
        root_team: Readonly<{
            team_definition_id: string;
            team_definition_name: string;
            team_run_id: string;
            coordinator_address: string;
            members: readonly import("./team-execution-view-dtos.js").ConfiguredMemberExecutionDto[];
            task_executions: readonly import("./team-execution-view-dtos.js").TaskExecutionDto[];
        }>;
    }>, unknown>>;
    tasks: z.ZodArray<z.ZodObject<{
        task_id: z.ZodString;
        delegator_agent_run_id: z.ZodString;
        recipient_address: z.ZodString;
        task_execution: z.ZodUnion<readonly [z.ZodObject<{
            agent_run_id: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            team_run_id: z.ZodString;
        }, z.core.$strict>]>;
        description: z.ZodString;
        reference_files: z.ZodArray<z.ZodObject<{
            reference_id: z.ZodString;
            path: z.ZodString;
            type: z.ZodEnum<{
                file: "file";
                image: "image";
                audio: "audio";
                video: "video";
                pdf: "pdf";
                csv: "csv";
                excel: "excel";
                other: "other";
            }>;
            created_at: z.ZodString;
            updated_at: z.ZodString;
        }, z.core.$strict>>;
        status: z.ZodEnum<{
            interrupted: "interrupted";
            accepted: "accepted";
            active: "active";
            awaiting_review: "awaiting_review";
        }>;
        updates: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"submission">;
            submission_id: z.ZodString;
            message: z.ZodString;
            reference_files: z.ZodArray<z.ZodObject<{
                reference_id: z.ZodString;
                path: z.ZodString;
                type: z.ZodEnum<{
                    file: "file";
                    image: "image";
                    audio: "audio";
                    video: "video";
                    pdf: "pdf";
                    csv: "csv";
                    excel: "excel";
                    other: "other";
                }>;
                created_at: z.ZodString;
                updated_at: z.ZodString;
            }, z.core.$strict>>;
            created_at: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"review">;
            review_id: z.ZodString;
            reviewed_submission_id: z.ZodString;
            decision: z.ZodEnum<{
                accept: "accept";
                request_revision: "request_revision";
            }>;
            comment: z.ZodNullable<z.ZodString>;
            reference_files: z.ZodArray<z.ZodObject<{
                reference_id: z.ZodString;
                path: z.ZodString;
                type: z.ZodEnum<{
                    file: "file";
                    image: "image";
                    audio: "audio";
                    video: "video";
                    pdf: "pdf";
                    csv: "csv";
                    excel: "excel";
                    other: "other";
                }>;
                created_at: z.ZodString;
                updated_at: z.ZodString;
            }, z.core.$strict>>;
            created_at: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"interruption">;
            interruption_id: z.ZodString;
            reason: z.ZodString;
            created_at: z.ZodString;
        }, z.core.$strict>], "kind">>;
        created_at: z.ZodString;
    }, z.core.$strict>>;
    messages: z.ZodArray<z.ZodObject<{
        message_id: z.ZodString;
        sender_agent_run_id: z.ZodString;
        receiver_agent_run_id: z.ZodString;
        content: z.ZodString;
        message_type: z.ZodString;
        reference_files: z.ZodArray<z.ZodObject<{
            reference_id: z.ZodString;
            path: z.ZodString;
            type: z.ZodEnum<{
                file: "file";
                image: "image";
                audio: "audio";
                video: "video";
                pdf: "pdf";
                csv: "csv";
                excel: "excel";
                other: "other";
            }>;
            created_at: z.ZodString;
            updated_at: z.ZodString;
        }, z.core.$strict>>;
        created_at: z.ZodString;
    }, z.core.$strict>>;
    agent_statuses: z.ZodArray<z.ZodObject<{
        agent_run_id: z.ZodString;
        member_address: z.ZodString;
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
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const teamStreamServerMessageSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"SYSTEM_INSTRUCTIONS_SUPPLIED">;
    payload: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        trace_id: z.ZodString;
        content: z.ZodString;
        ts: z.ZodNumber;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TURN_STARTED">;
    payload: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TURN_COMPLETED">;
    payload: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
        reason: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TURN_INTERRUPTED">;
    payload: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
        reason: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"SEGMENT_START">;
    payload: z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"SEGMENT_CONTENT">;
    payload: z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"SEGMENT_END">;
    payload: z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"AGENT_STATUS">;
    payload: z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"COMPACTION_STATUS">;
    payload: z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TOKEN_USAGE_UPDATED">;
    payload: z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"ASSISTANT_COMPLETE">;
    payload: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
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
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        arguments: z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>;
        invocation_id: z.ZodString;
        tool_name: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TOOL_APPROVED">;
    payload: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        reason: z.ZodNullable<z.ZodString>;
        invocation_id: z.ZodString;
        tool_name: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TOOL_DENIED">;
    payload: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
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
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        arguments: z.ZodNullable<z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>>;
        invocation_id: z.ZodString;
        tool_name: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TOOL_EXECUTION_SUCCEEDED">;
    payload: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        arguments: z.ZodNullable<z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>>;
        result: z.ZodNullable<z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>>;
        invocation_id: z.ZodString;
        tool_name: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TOOL_EXECUTION_FAILED">;
    payload: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        arguments: z.ZodNullable<z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>>;
        error: z.ZodString;
        invocation_id: z.ZodString;
        tool_name: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TOOL_EXECUTION_INTERRUPTED">;
    payload: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        arguments: z.ZodNullable<z.ZodType<import("./schema-helpers.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./schema-helpers.js").JsonValue, unknown>>>;
        reason: z.ZodString;
        invocation_id: z.ZodString;
        tool_name: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TOOL_LOG">;
    payload: z.ZodObject<{
        change_sequence: z.ZodNumber;
        agent_run_id: z.ZodString;
        log_entry: z.ZodString;
        tool_invocation_id: z.ZodString;
        tool_name: z.ZodString;
        turn_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TODO_LIST_UPDATE">;
    payload: z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"SYSTEM_TASK_NOTIFICATION">;
    payload: z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"ARTIFACT_PERSISTED">;
    payload: z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"FILE_CHANGE">;
    payload: z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"CONNECTED">;
    payload: z.ZodObject<{
        session_id: z.ZodString;
        root_team_run_id: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TEAM_RUN_LIFECYCLE">;
    payload: z.ZodObject<{
        is_active: z.ZodBoolean;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TEAM_EXECUTION_VIEW_SNAPSHOT">;
    payload: z.ZodObject<{
        root_team_run_id: z.ZodString;
        base_change_sequence: z.ZodNumber;
        execution_tree: z.ZodType<Readonly<{
            schema_version: 1;
            created_at: string;
            archived_at: string | null;
            application_binding: Readonly<{
                application_id: string;
                binding_id: string;
            }> | null;
            handoffs: readonly Readonly<{
                from: string;
                to: string;
                rules: readonly string[];
            }>[];
            root_team: Readonly<{
                team_definition_id: string;
                team_definition_name: string;
                team_run_id: string;
                coordinator_address: string;
                members: readonly import("./team-execution-view-dtos.js").ConfiguredMemberExecutionDto[];
                task_executions: readonly import("./team-execution-view-dtos.js").TaskExecutionDto[];
            }>;
        }>, unknown, z.core.$ZodTypeInternals<Readonly<{
            schema_version: 1;
            created_at: string;
            archived_at: string | null;
            application_binding: Readonly<{
                application_id: string;
                binding_id: string;
            }> | null;
            handoffs: readonly Readonly<{
                from: string;
                to: string;
                rules: readonly string[];
            }>[];
            root_team: Readonly<{
                team_definition_id: string;
                team_definition_name: string;
                team_run_id: string;
                coordinator_address: string;
                members: readonly import("./team-execution-view-dtos.js").ConfiguredMemberExecutionDto[];
                task_executions: readonly import("./team-execution-view-dtos.js").TaskExecutionDto[];
            }>;
        }>, unknown>>;
        tasks: z.ZodArray<z.ZodObject<{
            task_id: z.ZodString;
            delegator_agent_run_id: z.ZodString;
            recipient_address: z.ZodString;
            task_execution: z.ZodUnion<readonly [z.ZodObject<{
                agent_run_id: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                team_run_id: z.ZodString;
            }, z.core.$strict>]>;
            description: z.ZodString;
            reference_files: z.ZodArray<z.ZodObject<{
                reference_id: z.ZodString;
                path: z.ZodString;
                type: z.ZodEnum<{
                    file: "file";
                    image: "image";
                    audio: "audio";
                    video: "video";
                    pdf: "pdf";
                    csv: "csv";
                    excel: "excel";
                    other: "other";
                }>;
                created_at: z.ZodString;
                updated_at: z.ZodString;
            }, z.core.$strict>>;
            status: z.ZodEnum<{
                interrupted: "interrupted";
                accepted: "accepted";
                active: "active";
                awaiting_review: "awaiting_review";
            }>;
            updates: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"submission">;
                submission_id: z.ZodString;
                message: z.ZodString;
                reference_files: z.ZodArray<z.ZodObject<{
                    reference_id: z.ZodString;
                    path: z.ZodString;
                    type: z.ZodEnum<{
                        file: "file";
                        image: "image";
                        audio: "audio";
                        video: "video";
                        pdf: "pdf";
                        csv: "csv";
                        excel: "excel";
                        other: "other";
                    }>;
                    created_at: z.ZodString;
                    updated_at: z.ZodString;
                }, z.core.$strict>>;
                created_at: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"review">;
                review_id: z.ZodString;
                reviewed_submission_id: z.ZodString;
                decision: z.ZodEnum<{
                    accept: "accept";
                    request_revision: "request_revision";
                }>;
                comment: z.ZodNullable<z.ZodString>;
                reference_files: z.ZodArray<z.ZodObject<{
                    reference_id: z.ZodString;
                    path: z.ZodString;
                    type: z.ZodEnum<{
                        file: "file";
                        image: "image";
                        audio: "audio";
                        video: "video";
                        pdf: "pdf";
                        csv: "csv";
                        excel: "excel";
                        other: "other";
                    }>;
                    created_at: z.ZodString;
                    updated_at: z.ZodString;
                }, z.core.$strict>>;
                created_at: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"interruption">;
                interruption_id: z.ZodString;
                reason: z.ZodString;
                created_at: z.ZodString;
            }, z.core.$strict>], "kind">>;
            created_at: z.ZodString;
        }, z.core.$strict>>;
        messages: z.ZodArray<z.ZodObject<{
            message_id: z.ZodString;
            sender_agent_run_id: z.ZodString;
            receiver_agent_run_id: z.ZodString;
            content: z.ZodString;
            message_type: z.ZodString;
            reference_files: z.ZodArray<z.ZodObject<{
                reference_id: z.ZodString;
                path: z.ZodString;
                type: z.ZodEnum<{
                    file: "file";
                    image: "image";
                    audio: "audio";
                    video: "video";
                    pdf: "pdf";
                    csv: "csv";
                    excel: "excel";
                    other: "other";
                }>;
                created_at: z.ZodString;
                updated_at: z.ZodString;
            }, z.core.$strict>>;
            created_at: z.ZodString;
        }, z.core.$strict>>;
        agent_statuses: z.ZodArray<z.ZodObject<{
            agent_run_id: z.ZodString;
            member_address: z.ZodString;
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
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"AGENT_COMMAND_ACK">;
    payload: z.ZodUnion<readonly [z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TASK_DELEGATION_EVENT">;
    payload: z.ZodDiscriminatedUnion<[z.ZodObject<{
        event_type: z.ZodLiteral<"TASK_AGENT_ACTIVATED">;
        change_sequence: z.ZodNumber;
        parent_team_run_id: z.ZodString;
        execution: z.ZodType<Readonly<{
            kind: "task_agent";
            address: string;
            agent_run_id: string;
            platform_agent_run_id: string | null;
            started_at: string;
            settled_at: string | null;
        }>, unknown, z.core.$ZodTypeInternals<Readonly<{
            kind: "task_agent";
            address: string;
            agent_run_id: string;
            platform_agent_run_id: string | null;
            started_at: string;
            settled_at: string | null;
        }>, unknown>>;
        task: z.ZodObject<{
            task_id: z.ZodString;
            delegator_agent_run_id: z.ZodString;
            recipient_address: z.ZodString;
            task_execution: z.ZodUnion<readonly [z.ZodObject<{
                agent_run_id: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                team_run_id: z.ZodString;
            }, z.core.$strict>]>;
            description: z.ZodString;
            reference_files: z.ZodArray<z.ZodObject<{
                reference_id: z.ZodString;
                path: z.ZodString;
                type: z.ZodEnum<{
                    file: "file";
                    image: "image";
                    audio: "audio";
                    video: "video";
                    pdf: "pdf";
                    csv: "csv";
                    excel: "excel";
                    other: "other";
                }>;
                created_at: z.ZodString;
                updated_at: z.ZodString;
            }, z.core.$strict>>;
            status: z.ZodEnum<{
                interrupted: "interrupted";
                accepted: "accepted";
                active: "active";
                awaiting_review: "awaiting_review";
            }>;
            updates: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"submission">;
                submission_id: z.ZodString;
                message: z.ZodString;
                reference_files: z.ZodArray<z.ZodObject<{
                    reference_id: z.ZodString;
                    path: z.ZodString;
                    type: z.ZodEnum<{
                        file: "file";
                        image: "image";
                        audio: "audio";
                        video: "video";
                        pdf: "pdf";
                        csv: "csv";
                        excel: "excel";
                        other: "other";
                    }>;
                    created_at: z.ZodString;
                    updated_at: z.ZodString;
                }, z.core.$strict>>;
                created_at: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"review">;
                review_id: z.ZodString;
                reviewed_submission_id: z.ZodString;
                decision: z.ZodEnum<{
                    accept: "accept";
                    request_revision: "request_revision";
                }>;
                comment: z.ZodNullable<z.ZodString>;
                reference_files: z.ZodArray<z.ZodObject<{
                    reference_id: z.ZodString;
                    path: z.ZodString;
                    type: z.ZodEnum<{
                        file: "file";
                        image: "image";
                        audio: "audio";
                        video: "video";
                        pdf: "pdf";
                        csv: "csv";
                        excel: "excel";
                        other: "other";
                    }>;
                    created_at: z.ZodString;
                    updated_at: z.ZodString;
                }, z.core.$strict>>;
                created_at: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"interruption">;
                interruption_id: z.ZodString;
                reason: z.ZodString;
                created_at: z.ZodString;
            }, z.core.$strict>], "kind">>;
            created_at: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>, z.ZodObject<{
        event_type: z.ZodLiteral<"TASK_TEAM_ACTIVATED">;
        change_sequence: z.ZodNumber;
        parent_team_run_id: z.ZodString;
        execution: z.ZodType<Readonly<{
            kind: "task_team";
            address: string;
            team_run_id: string;
            members: readonly import("./team-execution-view-dtos.js").TaskTeamMemberExecutionDto[];
            task_executions: readonly import("./team-execution-view-dtos.js").TaskExecutionDto[];
            started_at: string;
            settled_at: string | null;
        }>, unknown, z.core.$ZodTypeInternals<Readonly<{
            kind: "task_team";
            address: string;
            team_run_id: string;
            members: readonly import("./team-execution-view-dtos.js").TaskTeamMemberExecutionDto[];
            task_executions: readonly import("./team-execution-view-dtos.js").TaskExecutionDto[];
            started_at: string;
            settled_at: string | null;
        }>, unknown>>;
        task: z.ZodObject<{
            task_id: z.ZodString;
            delegator_agent_run_id: z.ZodString;
            recipient_address: z.ZodString;
            task_execution: z.ZodUnion<readonly [z.ZodObject<{
                agent_run_id: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                team_run_id: z.ZodString;
            }, z.core.$strict>]>;
            description: z.ZodString;
            reference_files: z.ZodArray<z.ZodObject<{
                reference_id: z.ZodString;
                path: z.ZodString;
                type: z.ZodEnum<{
                    file: "file";
                    image: "image";
                    audio: "audio";
                    video: "video";
                    pdf: "pdf";
                    csv: "csv";
                    excel: "excel";
                    other: "other";
                }>;
                created_at: z.ZodString;
                updated_at: z.ZodString;
            }, z.core.$strict>>;
            status: z.ZodEnum<{
                interrupted: "interrupted";
                accepted: "accepted";
                active: "active";
                awaiting_review: "awaiting_review";
            }>;
            updates: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"submission">;
                submission_id: z.ZodString;
                message: z.ZodString;
                reference_files: z.ZodArray<z.ZodObject<{
                    reference_id: z.ZodString;
                    path: z.ZodString;
                    type: z.ZodEnum<{
                        file: "file";
                        image: "image";
                        audio: "audio";
                        video: "video";
                        pdf: "pdf";
                        csv: "csv";
                        excel: "excel";
                        other: "other";
                    }>;
                    created_at: z.ZodString;
                    updated_at: z.ZodString;
                }, z.core.$strict>>;
                created_at: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"review">;
                review_id: z.ZodString;
                reviewed_submission_id: z.ZodString;
                decision: z.ZodEnum<{
                    accept: "accept";
                    request_revision: "request_revision";
                }>;
                comment: z.ZodNullable<z.ZodString>;
                reference_files: z.ZodArray<z.ZodObject<{
                    reference_id: z.ZodString;
                    path: z.ZodString;
                    type: z.ZodEnum<{
                        file: "file";
                        image: "image";
                        audio: "audio";
                        video: "video";
                        pdf: "pdf";
                        csv: "csv";
                        excel: "excel";
                        other: "other";
                    }>;
                    created_at: z.ZodString;
                    updated_at: z.ZodString;
                }, z.core.$strict>>;
                created_at: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"interruption">;
                interruption_id: z.ZodString;
                reason: z.ZodString;
                created_at: z.ZodString;
            }, z.core.$strict>], "kind">>;
            created_at: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>, z.ZodObject<{
        event_type: z.ZodLiteral<"TASK_EXECUTION_SETTLED">;
        change_sequence: z.ZodNumber;
        execution: z.ZodUnion<readonly [z.ZodObject<{
            agent_run_id: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            team_run_id: z.ZodString;
        }, z.core.$strict>]>;
        task: z.ZodObject<{
            task_id: z.ZodString;
            delegator_agent_run_id: z.ZodString;
            recipient_address: z.ZodString;
            task_execution: z.ZodUnion<readonly [z.ZodObject<{
                agent_run_id: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                team_run_id: z.ZodString;
            }, z.core.$strict>]>;
            description: z.ZodString;
            reference_files: z.ZodArray<z.ZodObject<{
                reference_id: z.ZodString;
                path: z.ZodString;
                type: z.ZodEnum<{
                    file: "file";
                    image: "image";
                    audio: "audio";
                    video: "video";
                    pdf: "pdf";
                    csv: "csv";
                    excel: "excel";
                    other: "other";
                }>;
                created_at: z.ZodString;
                updated_at: z.ZodString;
            }, z.core.$strict>>;
            status: z.ZodEnum<{
                interrupted: "interrupted";
                accepted: "accepted";
                active: "active";
                awaiting_review: "awaiting_review";
            }>;
            updates: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"submission">;
                submission_id: z.ZodString;
                message: z.ZodString;
                reference_files: z.ZodArray<z.ZodObject<{
                    reference_id: z.ZodString;
                    path: z.ZodString;
                    type: z.ZodEnum<{
                        file: "file";
                        image: "image";
                        audio: "audio";
                        video: "video";
                        pdf: "pdf";
                        csv: "csv";
                        excel: "excel";
                        other: "other";
                    }>;
                    created_at: z.ZodString;
                    updated_at: z.ZodString;
                }, z.core.$strict>>;
                created_at: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"review">;
                review_id: z.ZodString;
                reviewed_submission_id: z.ZodString;
                decision: z.ZodEnum<{
                    accept: "accept";
                    request_revision: "request_revision";
                }>;
                comment: z.ZodNullable<z.ZodString>;
                reference_files: z.ZodArray<z.ZodObject<{
                    reference_id: z.ZodString;
                    path: z.ZodString;
                    type: z.ZodEnum<{
                        file: "file";
                        image: "image";
                        audio: "audio";
                        video: "video";
                        pdf: "pdf";
                        csv: "csv";
                        excel: "excel";
                        other: "other";
                    }>;
                    created_at: z.ZodString;
                    updated_at: z.ZodString;
                }, z.core.$strict>>;
                created_at: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"interruption">;
                interruption_id: z.ZodString;
                reason: z.ZodString;
                created_at: z.ZodString;
            }, z.core.$strict>], "kind">>;
            created_at: z.ZodString;
        }, z.core.$strict>;
        settled_at: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        event_type: z.ZodLiteral<"TASK_CHANGED">;
        change_sequence: z.ZodNumber;
        task: z.ZodObject<{
            task_id: z.ZodString;
            delegator_agent_run_id: z.ZodString;
            recipient_address: z.ZodString;
            task_execution: z.ZodUnion<readonly [z.ZodObject<{
                agent_run_id: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                team_run_id: z.ZodString;
            }, z.core.$strict>]>;
            description: z.ZodString;
            reference_files: z.ZodArray<z.ZodObject<{
                reference_id: z.ZodString;
                path: z.ZodString;
                type: z.ZodEnum<{
                    file: "file";
                    image: "image";
                    audio: "audio";
                    video: "video";
                    pdf: "pdf";
                    csv: "csv";
                    excel: "excel";
                    other: "other";
                }>;
                created_at: z.ZodString;
                updated_at: z.ZodString;
            }, z.core.$strict>>;
            status: z.ZodEnum<{
                interrupted: "interrupted";
                accepted: "accepted";
                active: "active";
                awaiting_review: "awaiting_review";
            }>;
            updates: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"submission">;
                submission_id: z.ZodString;
                message: z.ZodString;
                reference_files: z.ZodArray<z.ZodObject<{
                    reference_id: z.ZodString;
                    path: z.ZodString;
                    type: z.ZodEnum<{
                        file: "file";
                        image: "image";
                        audio: "audio";
                        video: "video";
                        pdf: "pdf";
                        csv: "csv";
                        excel: "excel";
                        other: "other";
                    }>;
                    created_at: z.ZodString;
                    updated_at: z.ZodString;
                }, z.core.$strict>>;
                created_at: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"review">;
                review_id: z.ZodString;
                reviewed_submission_id: z.ZodString;
                decision: z.ZodEnum<{
                    accept: "accept";
                    request_revision: "request_revision";
                }>;
                comment: z.ZodNullable<z.ZodString>;
                reference_files: z.ZodArray<z.ZodObject<{
                    reference_id: z.ZodString;
                    path: z.ZodString;
                    type: z.ZodEnum<{
                        file: "file";
                        image: "image";
                        audio: "audio";
                        video: "video";
                        pdf: "pdf";
                        csv: "csv";
                        excel: "excel";
                        other: "other";
                    }>;
                    created_at: z.ZodString;
                    updated_at: z.ZodString;
                }, z.core.$strict>>;
                created_at: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"interruption">;
                interruption_id: z.ZodString;
                reason: z.ZodString;
                created_at: z.ZodString;
            }, z.core.$strict>], "kind">>;
            created_at: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>], "event_type">;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TEAM_COMMUNICATION_MESSAGE">;
    payload: z.ZodObject<{
        change_sequence: z.ZodNumber;
        message: z.ZodObject<{
            message_id: z.ZodString;
            sender_agent_run_id: z.ZodString;
            receiver_agent_run_id: z.ZodString;
            content: z.ZodString;
            message_type: z.ZodString;
            reference_files: z.ZodArray<z.ZodObject<{
                reference_id: z.ZodString;
                path: z.ZodString;
                type: z.ZodEnum<{
                    file: "file";
                    image: "image";
                    audio: "audio";
                    video: "video";
                    pdf: "pdf";
                    csv: "csv";
                    excel: "excel";
                    other: "other";
                }>;
                created_at: z.ZodString;
                updated_at: z.ZodString;
            }, z.core.$strict>>;
            created_at: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"MEMBER_INPUT_MESSAGE">;
    payload: z.ZodObject<{
        change_sequence: z.ZodNumber;
        recipient_agent_run_id: z.ZodString;
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
        sender_agent_run_id: z.ZodNullable<z.ZodString>;
        parent_communication_message_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"EXTERNAL_USER_MESSAGE">;
    payload: z.ZodObject<{
        agent_run_id: z.ZodString;
        member_address: z.ZodString;
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
    type: "TEAM_EXECUTION_VIEW_SNAPSHOT";
    payload: z.infer<typeof teamExecutionViewSnapshotPayloadSchema>;
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