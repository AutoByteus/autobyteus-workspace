import { z } from "zod";
/** A delegated child (task Agent or task Team) was committed under its host TeamRun. */
export declare const teamTaskExecutionStartedPayloadSchema: z.ZodObject<{
    change_sequence: z.ZodNumber;
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
export type TeamTaskExecutionStartedPayload = Readonly<z.infer<typeof teamTaskExecutionStartedPayloadSchema>>;
/** Identity of one task execution node (a task Agent or a task Team) of the root's execution tree. */
export declare const teamTaskExecutionReferenceDtoSchema: z.ZodUnion<readonly [z.ZodObject<{
    agent_run_id: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    team_run_id: z.ZodString;
}, z.core.$strict>]>;
export type TeamTaskExecutionReferenceDto = Readonly<z.infer<typeof teamTaskExecutionReferenceDtoSchema>>;
/** These task executions were closed (their Task became DONE); the tree keeps them, the Workspaces listing leaves them out. */
export declare const teamTaskExecutionsClosedPayloadSchema: z.ZodObject<{
    change_sequence: z.ZodNumber;
    task_executions: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        agent_run_id: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        team_run_id: z.ZodString;
    }, z.core.$strict>]>>;
}, z.core.$strict>;
export type TeamTaskExecutionsClosedPayload = Readonly<z.infer<typeof teamTaskExecutionsClosedPayloadSchema>>;
/**
 * These closed task executions were reactivated by their assigner, or given another Task, and are in the tree again
 * (autobyteus-469 D-8). Each carries its record and parent Team run, as "started" does, so a view that no longer holds
 * the run (it left the tree when its Task closed) inserts it; one that holds it lists it again.
 */
export declare const teamTaskExecutionsReopenedPayloadSchema: z.ZodObject<{
    change_sequence: z.ZodNumber;
    executions: z.ZodArray<z.ZodObject<{
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
    }, z.core.$strict>>;
}, z.core.$strict>;
export type TeamTaskExecutionsReopenedPayload = Readonly<z.infer<typeof teamTaskExecutionsReopenedPayloadSchema>>;
/**
 * The user's model choices of these delegated copies were saved on the live run
 * (DS-001). Each names one record by its run ID (unique in the tree) with its choice as now recorded.
 */
export declare const teamDelegatedLaunchSelectionsChangedPayloadSchema: z.ZodObject<{
    change_sequence: z.ZodNumber;
    selections: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        agent_run_id: z.ZodString;
        selection: z.ZodType<Readonly<{
            runtime_kind?: import("./team-execution-view-dtos.js").AgentLaunchConfigurationDto["runtime_kind"];
            llm_model_identifier: string;
            llm_config: Readonly<Record<string, import("./schema-helpers.js").JsonValue>> | null;
            selected_at: string;
        }>, unknown, z.core.$ZodTypeInternals<Readonly<{
            runtime_kind?: import("./team-execution-view-dtos.js").AgentLaunchConfigurationDto["runtime_kind"];
            llm_model_identifier: string;
            llm_config: Readonly<Record<string, import("./schema-helpers.js").JsonValue>> | null;
            selected_at: string;
        }>, unknown>>;
    }, z.core.$strict>, z.ZodObject<{
        team_run_id: z.ZodString;
        selection: z.ZodType<Readonly<{
            runtime_kind?: import("./team-execution-view-dtos.js").AgentLaunchConfigurationDto["runtime_kind"];
            llm_model_identifier: string;
            llm_config: Readonly<Record<string, import("./schema-helpers.js").JsonValue>> | null;
            selected_at: string;
        }>, unknown, z.core.$ZodTypeInternals<Readonly<{
            runtime_kind?: import("./team-execution-view-dtos.js").AgentLaunchConfigurationDto["runtime_kind"];
            llm_model_identifier: string;
            llm_config: Readonly<Record<string, import("./schema-helpers.js").JsonValue>> | null;
            selected_at: string;
        }>, unknown>>;
    }, z.core.$strict>]>>;
}, z.core.$strict>;
export type TeamDelegatedLaunchSelectionsChangedPayload = Readonly<z.infer<typeof teamDelegatedLaunchSelectionsChangedPayloadSchema>>;
//# sourceMappingURL=team-task-execution-message-dtos.d.ts.map