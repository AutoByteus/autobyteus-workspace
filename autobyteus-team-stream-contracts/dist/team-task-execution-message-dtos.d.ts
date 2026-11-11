import { z } from "zod";
/** Identity of one child row (a run on this node the Team delegated to, or a peer's run). */
export declare const teamTaskExecutionReferenceDtoSchema: z.ZodUnion<readonly [z.ZodObject<{
    agent_run_id: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    team_run_id: z.ZodString;
}, z.core.$strict>]>;
export type TeamTaskExecutionReferenceDto = Readonly<z.infer<typeof teamTaskExecutionReferenceDtoSchema>>;
/** A child row on this node with the Team run it is listed under, as the view projects it. */
export declare const teamChildRunRowDtoSchema: z.ZodObject<{
    parent_team_run_id: z.ZodString;
    execution: z.ZodUnion<readonly [z.ZodType<Readonly<{
        kind: "task_agent";
        address: string;
        agent_run_id: string;
        platform_agent_run_id: string | null;
        delegator_agent_run_id: string | null;
        started_at: string;
        source: import("./team-execution-view-dtos.js").TaskAgentExecutionSourceDto;
        user_launch_selection?: import("./team-execution-view-dtos.js").UserLaunchSelectionDto;
    }>, unknown, z.core.$ZodTypeInternals<Readonly<{
        kind: "task_agent";
        address: string;
        agent_run_id: string;
        platform_agent_run_id: string | null;
        delegator_agent_run_id: string | null;
        started_at: string;
        source: import("./team-execution-view-dtos.js").TaskAgentExecutionSourceDto;
        user_launch_selection?: import("./team-execution-view-dtos.js").UserLaunchSelectionDto;
    }>, unknown>>, z.ZodType<Readonly<{
        kind: "task_team";
        address: string;
        team_run_id: string;
        members: readonly import("./team-execution-view-dtos.js").TaskTeamAgentExecutionDto[];
        task_executions: readonly import("./team-execution-view-dtos.js").TaskExecutionDto[];
        delegator_agent_run_id: string | null;
        started_at: string;
        source: import("./team-execution-view-dtos.js").TaskTeamExecutionSourceDto;
        user_team_launch_selection?: import("./team-execution-view-dtos.js").UserLaunchSelectionDto;
    }>, unknown, z.core.$ZodTypeInternals<Readonly<{
        kind: "task_team";
        address: string;
        team_run_id: string;
        members: readonly import("./team-execution-view-dtos.js").TaskTeamAgentExecutionDto[];
        task_executions: readonly import("./team-execution-view-dtos.js").TaskExecutionDto[];
        delegator_agent_run_id: string | null;
        started_at: string;
        source: import("./team-execution-view-dtos.js").TaskTeamExecutionSourceDto;
        user_team_launch_selection?: import("./team-execution-view-dtos.js").UserLaunchSelectionDto;
    }>, unknown>>]>;
}, z.core.$strict>;
/**
 * The Team run's child rows changed (autobyteus-461 DS-8, SR-042 … SR-044): each new or reopened child's row (a run on
 * this node with its parent Team run, or a peer's run), and the runs that left the view. Unsequenced: the client applies
 * it by membership (a held added row is skipped, an unknown removed row ignored), never through a recovery.
 */
export declare const teamChildRunsChangedPayloadSchema: z.ZodObject<{
    run_id: z.ZodString;
    added: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        parent_team_run_id: z.ZodString;
        execution: z.ZodUnion<readonly [z.ZodType<Readonly<{
            kind: "task_agent";
            address: string;
            agent_run_id: string;
            platform_agent_run_id: string | null;
            delegator_agent_run_id: string | null;
            started_at: string;
            source: import("./team-execution-view-dtos.js").TaskAgentExecutionSourceDto;
            user_launch_selection?: import("./team-execution-view-dtos.js").UserLaunchSelectionDto;
        }>, unknown, z.core.$ZodTypeInternals<Readonly<{
            kind: "task_agent";
            address: string;
            agent_run_id: string;
            platform_agent_run_id: string | null;
            delegator_agent_run_id: string | null;
            started_at: string;
            source: import("./team-execution-view-dtos.js").TaskAgentExecutionSourceDto;
            user_launch_selection?: import("./team-execution-view-dtos.js").UserLaunchSelectionDto;
        }>, unknown>>, z.ZodType<Readonly<{
            kind: "task_team";
            address: string;
            team_run_id: string;
            members: readonly import("./team-execution-view-dtos.js").TaskTeamAgentExecutionDto[];
            task_executions: readonly import("./team-execution-view-dtos.js").TaskExecutionDto[];
            delegator_agent_run_id: string | null;
            started_at: string;
            source: import("./team-execution-view-dtos.js").TaskTeamExecutionSourceDto;
            user_team_launch_selection?: import("./team-execution-view-dtos.js").UserLaunchSelectionDto;
        }>, unknown, z.core.$ZodTypeInternals<Readonly<{
            kind: "task_team";
            address: string;
            team_run_id: string;
            members: readonly import("./team-execution-view-dtos.js").TaskTeamAgentExecutionDto[];
            task_executions: readonly import("./team-execution-view-dtos.js").TaskExecutionDto[];
            delegator_agent_run_id: string | null;
            started_at: string;
            source: import("./team-execution-view-dtos.js").TaskTeamExecutionSourceDto;
            user_team_launch_selection?: import("./team-execution-view-dtos.js").UserLaunchSelectionDto;
        }>, unknown>>]>;
    }, z.core.$strict>, z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"agent">;
        address: z.ZodString;
        agent_run_id: z.ZodString;
        node_id: z.ZodString;
        node_name: z.ZodString;
        delegator_agent_run_id: z.ZodString;
        started_at: z.ZodString;
        launches: z.ZodOptional<z.ZodArray<z.ZodObject<{
            address: z.ZodString;
            runtime_kind: z.ZodString;
            llm_model_identifier: z.ZodString;
            source: z.ZodUnion<readonly [z.ZodObject<{
                origin: z.ZodEnum<{
                    agent_default: "agent_default";
                    team_default: "team_default";
                    inherited: "inherited";
                    configured: "configured";
                }>;
                fallbacks: z.ZodArray<z.ZodObject<{
                    layer: z.ZodEnum<{
                        agent_default: "agent_default";
                        team_default: "team_default";
                        model_router: "model_router";
                    }>;
                    runtime_kind: z.ZodNullable<z.ZodString>;
                    llm_model_identifier: z.ZodNullable<z.ZodString>;
                    reason: z.ZodEnum<{
                        incomplete: "incomplete";
                        runtime_unavailable: "runtime_unavailable";
                        signed_out: "signed_out";
                        model_unavailable: "model_unavailable";
                        blocked: "blocked";
                        model_settings_invalid: "model_settings_invalid";
                        router_not_active: "router_not_active";
                        router_failed: "router_failed";
                    }>;
                    detail: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>, z.ZodObject<{
                origin: z.ZodLiteral<"model_router">;
                fallbacks: z.ZodArray<z.ZodObject<{
                    layer: z.ZodEnum<{
                        agent_default: "agent_default";
                        team_default: "team_default";
                        model_router: "model_router";
                    }>;
                    runtime_kind: z.ZodNullable<z.ZodString>;
                    llm_model_identifier: z.ZodNullable<z.ZodString>;
                    reason: z.ZodEnum<{
                        incomplete: "incomplete";
                        runtime_unavailable: "runtime_unavailable";
                        signed_out: "signed_out";
                        model_unavailable: "model_unavailable";
                        blocked: "blocked";
                        model_settings_invalid: "model_settings_invalid";
                        router_not_active: "router_not_active";
                        router_failed: "router_failed";
                    }>;
                    detail: z.ZodString;
                }, z.core.$strict>>;
                choice_reason: z.ZodString;
                task_kind: z.ZodString;
            }, z.core.$strict>]>;
        }, z.core.$strict>>>;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"agent_team">;
        address: z.ZodString;
        team_run_id: z.ZodString;
        node_id: z.ZodString;
        node_name: z.ZodString;
        coordinator_address: z.ZodString;
        members: z.ZodArray<z.ZodObject<{
            address: z.ZodString;
            agent_run_id: z.ZodString;
        }, z.core.$strict>>;
        delegator_agent_run_id: z.ZodString;
        started_at: z.ZodString;
        launches: z.ZodOptional<z.ZodArray<z.ZodObject<{
            address: z.ZodString;
            runtime_kind: z.ZodString;
            llm_model_identifier: z.ZodString;
            source: z.ZodUnion<readonly [z.ZodObject<{
                origin: z.ZodEnum<{
                    agent_default: "agent_default";
                    team_default: "team_default";
                    inherited: "inherited";
                    configured: "configured";
                }>;
                fallbacks: z.ZodArray<z.ZodObject<{
                    layer: z.ZodEnum<{
                        agent_default: "agent_default";
                        team_default: "team_default";
                        model_router: "model_router";
                    }>;
                    runtime_kind: z.ZodNullable<z.ZodString>;
                    llm_model_identifier: z.ZodNullable<z.ZodString>;
                    reason: z.ZodEnum<{
                        incomplete: "incomplete";
                        runtime_unavailable: "runtime_unavailable";
                        signed_out: "signed_out";
                        model_unavailable: "model_unavailable";
                        blocked: "blocked";
                        model_settings_invalid: "model_settings_invalid";
                        router_not_active: "router_not_active";
                        router_failed: "router_failed";
                    }>;
                    detail: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>, z.ZodObject<{
                origin: z.ZodLiteral<"model_router">;
                fallbacks: z.ZodArray<z.ZodObject<{
                    layer: z.ZodEnum<{
                        agent_default: "agent_default";
                        team_default: "team_default";
                        model_router: "model_router";
                    }>;
                    runtime_kind: z.ZodNullable<z.ZodString>;
                    llm_model_identifier: z.ZodNullable<z.ZodString>;
                    reason: z.ZodEnum<{
                        incomplete: "incomplete";
                        runtime_unavailable: "runtime_unavailable";
                        signed_out: "signed_out";
                        model_unavailable: "model_unavailable";
                        blocked: "blocked";
                        model_settings_invalid: "model_settings_invalid";
                        router_not_active: "router_not_active";
                        router_failed: "router_failed";
                    }>;
                    detail: z.ZodString;
                }, z.core.$strict>>;
                choice_reason: z.ZodString;
                task_kind: z.ZodString;
            }, z.core.$strict>]>;
        }, z.core.$strict>>>;
    }, z.core.$strict>], "kind">]>>;
    removed: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        agent_run_id: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        team_run_id: z.ZodString;
    }, z.core.$strict>]>>;
}, z.core.$strict>;
export type TeamChildRunsChangedPayload = Readonly<z.infer<typeof teamChildRunsChangedPayloadSchema>>;
//# sourceMappingURL=team-task-execution-message-dtos.d.ts.map