import { z } from "zod";
export declare const agentTeamAddressDtoSchema: z.ZodString;
export declare const teamMemberExecutionIdentityDtoSchema: z.ZodObject<{
    agent_run_id: z.ZodString;
    member_address: z.ZodString;
}, z.core.$strict>;
export type AgentLaunchConfigurationDto = Readonly<{
    runtime_kind: "autobyteus" | "claude_agent_sdk" | "codex_app_server" | "antigravity_cli" | "grok_build";
    llm_model_identifier: string;
    llm_config: Readonly<Record<string, import("./schema-helpers.js").JsonValue>> | null;
    auto_execute_tools: boolean;
    workspace_root_path: string | null;
}>;
export type ConfiguredAgentExecutionDto = Readonly<{
    kind: "configured_agent";
    address: string;
    agent_definition_id: string;
    role: string | null;
    description: string | null;
    agent_run_id: string;
    platform_agent_run_id: string | null;
    launch_configuration: AgentLaunchConfigurationDto;
}>;
/** The definition snapshot of a task copy started from the catalog (absent for every other copy). */
export type TaskAgentExecutionSourceDto = Readonly<{
    kind: "agent";
    agent_definition_id: string;
    launch_configuration: AgentLaunchConfigurationDto;
}>;
export type TaskTeamExecutionSourceDto = Readonly<{
    kind: "agent_team";
    team_definition_id: string;
    coordinator_address: string;
    members: readonly Readonly<{
        address: string;
        agent_definition_id: string;
    }>[];
    handoffs: readonly Readonly<{
        from: string;
        to: string;
        rules: readonly string[];
    }>[];
    default_launch_configuration: AgentLaunchConfigurationDto;
}>;
/** A delegated child Agent; `delegator_agent_run_id` is the AgentRun that started it (null when not recorded). */
export type TaskAgentExecutionDto = Readonly<{
    kind: "task_agent";
    address: string;
    agent_run_id: string;
    platform_agent_run_id: string | null;
    delegator_agent_run_id: string | null;
    started_at: string;
    source?: TaskAgentExecutionSourceDto;
}>;
export type TaskTeamAgentExecutionDto = Readonly<{
    kind: "task_team_agent";
    address: string;
    agent_run_id: string;
    platform_agent_run_id: string | null;
}>;
export type TaskTeamNestedTeamExecutionDto = Readonly<{
    kind: "task_team_member";
    address: string;
    team_run_id: string;
    members: readonly TaskTeamMemberExecutionDto[];
    task_executions: readonly TaskExecutionDto[];
}>;
export type TaskTeamMemberExecutionDto = TaskTeamAgentExecutionDto | TaskTeamNestedTeamExecutionDto;
/** A delegated child Team; `delegator_agent_run_id` is the AgentRun that started it (null when not recorded). */
export type TaskTeamExecutionDto = Readonly<{
    kind: "task_team";
    address: string;
    team_run_id: string;
    members: readonly TaskTeamMemberExecutionDto[];
    task_executions: readonly TaskExecutionDto[];
    delegator_agent_run_id: string | null;
    started_at: string;
    source?: TaskTeamExecutionSourceDto;
}>;
export type TaskExecutionDto = TaskAgentExecutionDto | TaskTeamExecutionDto;
export type ConfiguredTeamExecutionDto = Readonly<{
    kind: "configured_team";
    address: string;
    team_definition_id: string;
    role: string | null;
    description: string | null;
    team_run_id: string;
    coordinator_address: string;
    default_launch_configuration: AgentLaunchConfigurationDto;
    members: readonly ConfiguredMemberExecutionDto[];
    task_executions: readonly TaskExecutionDto[];
}>;
export type ConfiguredMemberExecutionDto = ConfiguredAgentExecutionDto | ConfiguredTeamExecutionDto;
/**
 * One collaborator of the run: one instance of a shared Agent or Agent Team definition added
 * with `@`. Its run IDs are recorded in the entry; it starts on its first message.
 */
export type CollaboratorEntryDto = Readonly<{
    kind: "agent";
    address: string;
    agent_definition_id: string;
    agent_run_id: string;
    platform_agent_run_id: string | null;
    launch_configuration: AgentLaunchConfigurationDto;
    added_at: string;
    added_via_agent_run_id: string;
}> | Readonly<{
    kind: "agent_team";
    address: string;
    team_definition_id: string;
    team_run_id: string;
    coordinator_address: string;
    members: readonly Readonly<{
        address: string;
        agent_definition_id: string;
        agent_run_id: string;
        platform_agent_run_id: string | null;
    }>[];
    handoffs: readonly Readonly<{
        from: string;
        to: string;
        rules: readonly string[];
    }>[];
    default_launch_configuration: AgentLaunchConfigurationDto;
    task_executions: readonly TaskExecutionDto[];
    added_at: string;
    added_via_agent_run_id: string;
}>;
export declare const taskAgentExecutionDtoSchema: z.ZodType<TaskAgentExecutionDto>;
export declare const taskTeamExecutionDtoSchema: z.ZodType<TaskTeamExecutionDto>;
export declare const collaboratorEntryDtoSchema: z.ZodType<CollaboratorEntryDto>;
export type TeamRunExecutionTreeDto = Readonly<{
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
        address: "/";
        team_definition_id: string;
        team_definition_name: string;
        team_run_id: string;
        coordinator_address: string;
        default_launch_configuration: AgentLaunchConfigurationDto;
        members: readonly ConfiguredMemberExecutionDto[];
        collaborators: readonly CollaboratorEntryDto[];
        task_executions: readonly TaskExecutionDto[];
    }>;
}>;
export declare const teamRunExecutionTreeDtoSchema: z.ZodType<TeamRunExecutionTreeDto>;
export declare const teamAgentStatusDtoSchema: z.ZodObject<{
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
}, z.core.$strict>;
export type TeamMemberExecutionIdentityDto = Readonly<z.infer<typeof teamMemberExecutionIdentityDtoSchema>>;
export type TeamAgentStatusDto = Readonly<z.infer<typeof teamAgentStatusDtoSchema>>;
//# sourceMappingURL=team-execution-view-dtos.d.ts.map