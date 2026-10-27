import { z } from "zod";
/**
 * One agent's launch on the other node, as that node resolved it (autobyteus-32 REQ-009): its address under this root,
 * runtime, model and source (with the Model Router's reason and task kind when it chose). Absent on links recorded
 * before autobyteus-32.
 */
export declare const remoteAgentLaunchDtoSchema: z.ZodObject<{
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
}, z.core.$strict>;
export type RemoteAgentLaunchDto = Readonly<z.infer<typeof remoteAgentLaunchDtoSchema>>;
export declare const remoteTaskExecutionDtoSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
}, z.core.$strict>], "kind">;
export declare const remoteAgentStatusSchema: z.ZodEnum<{
    error: "error";
    offline: "offline";
    initializing: "initializing";
    idle: "idle";
    running: "running";
}>;
/**
 * What the run's node answered about one remote run: its title and the statuses of its own agents (an Agent's
 * run, or a Team's members). `reachable: false` when the node did not answer; then there is no title and no
 * status, and the window shows "Couldn't reach {node}." with Retry. `run_id` is the Agent run or the Team run.
 */
export declare const remoteTaskExecutionSummaryDtoSchema: z.ZodObject<{
    node_id: z.ZodString;
    run_id: z.ZodString;
    reachable: z.ZodBoolean;
    title: z.ZodNullable<z.ZodString>;
    statuses: z.ZodArray<z.ZodObject<{
        agent_run_id: z.ZodString;
        status: z.ZodEnum<{
            error: "error";
            offline: "offline";
            initializing: "initializing";
            idle: "idle";
            running: "running";
        }>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type RemoteTaskExecutionDto = Readonly<z.infer<typeof remoteTaskExecutionDtoSchema>>;
export type RemoteTaskExecutionSummaryDto = Readonly<z.infer<typeof remoteTaskExecutionSummaryDtoSchema>>;
export type RemoteAgentStatus = z.infer<typeof remoteAgentStatusSchema>;
/** The run ID a remote execution names on its node: the Agent run, or the Team run. */
export declare const remoteTaskExecutionRunIdOf: (execution: RemoteTaskExecutionDto) => string;
/** The agents of a remote execution as this root shows them: the Agent run, or every Team member. */
export declare const remoteTaskExecutionAgentsOf: (execution: RemoteTaskExecutionDto) => readonly Readonly<{
    address: string;
    agent_run_id: string;
}>[];
//# sourceMappingURL=remote-task-execution-dtos.d.ts.map