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
/**
 * Where an agent's (or a Team's) launch values came from and the configured layers skipped before
 * it. Absent on records written before sources existed ("not recorded").
 */
export type LaunchConfigurationSourceDto = Readonly<{
    origin: "agent_default" | "team_default" | "inherited";
    fallbacks: readonly Readonly<{
        layer: "agent_default" | "team_default";
        runtime_kind: string | null;
        llm_model_identifier: string | null;
        reason: "incomplete" | "runtime_unavailable" | "model_unavailable" | "model_settings_invalid";
        detail: string;
    }>[];
}>;
/** A recorded Team member's own launch: present only when it runs on its own agent default. */
type MemberLaunchDto = Readonly<{
    launch_configuration?: AgentLaunchConfigurationDto;
    launch_source?: LaunchConfigurationSourceDto;
}>;
type TeamLaunchDto = Readonly<{
    default_launch_configuration: AgentLaunchConfigurationDto;
    default_launch_source?: LaunchConfigurationSourceDto;
}>;
/**
 * The launch a collaborator-Team or catalog-Team-copy member runs with: its own, else its Team's.
 * Every reader of such a member's launch uses this, never the Team's value directly.
 */
export declare const teamMemberLaunchConfiguration: (team: Pick<TeamLaunchDto, "default_launch_configuration">, member: MemberLaunchDto) => AgentLaunchConfigurationDto;
/** The recorded source of such a member's launch: its own, else its Team's; null when not recorded. */
export declare const teamMemberLaunchSource: (team: Pick<TeamLaunchDto, "default_launch_source">, member: MemberLaunchDto) => LaunchConfigurationSourceDto | null;
/** The definition snapshot of a task copy started from the catalog (absent for every other copy). */
export type TaskAgentExecutionSourceDto = Readonly<{
    kind: "agent";
    agent_definition_id: string;
    launch_configuration: AgentLaunchConfigurationDto;
    launch_source?: LaunchConfigurationSourceDto;
}>;
export type TaskTeamExecutionSourceDto = Readonly<{
    kind: "agent_team";
    team_definition_id: string;
    coordinator_address: string;
    members: readonly (Readonly<{
        address: string;
        agent_definition_id: string;
    }> & MemberLaunchDto)[];
    handoffs: readonly Readonly<{
        from: string;
        to: string;
        rules: readonly string[];
    }>[];
}> & TeamLaunchDto;
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
 * One collaborator of the run: one instance of a shared Agent or Agent Team definition brought in.
 * Its run IDs and resolved launches are recorded in the entry; it starts on its first message.
 */
export type CollaboratorEntryDto = Readonly<{
    kind: "agent";
    address: string;
    agent_definition_id: string;
    agent_run_id: string;
    platform_agent_run_id: string | null;
    launch_configuration: AgentLaunchConfigurationDto;
    launch_source?: LaunchConfigurationSourceDto;
    added_at: string;
    added_via_agent_run_id: string;
}> | Readonly<{
    kind: "agent_team";
    address: string;
    team_definition_id: string;
    team_run_id: string;
    coordinator_address: string;
    members: readonly (Readonly<{
        address: string;
        agent_definition_id: string;
        agent_run_id: string;
        platform_agent_run_id: string | null;
    }> & MemberLaunchDto)[];
    handoffs: readonly Readonly<{
        from: string;
        to: string;
        rules: readonly string[];
    }>[];
    task_executions: readonly TaskExecutionDto[];
    added_at: string;
    added_via_agent_run_id: string;
}> & TeamLaunchDto;
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
    recoverableBlock: z.ZodNullable<z.ZodObject<{
        operationId: z.ZodString;
        failureEpoch: z.ZodNumber;
        position: z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"held_turn">;
            turnId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"next_turn">;
            failedTurnId: z.ZodString;
        }, z.core.$strict>], "kind">;
        state: z.ZodEnum<{
            awaiting_user: "awaiting_user";
            authorized: "authorized";
            recovering: "recovering";
        }>;
        code: z.ZodString;
        message: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type TeamMemberExecutionIdentityDto = Readonly<z.infer<typeof teamMemberExecutionIdentityDtoSchema>>;
export type TeamAgentStatusDto = Readonly<z.infer<typeof teamAgentStatusDtoSchema>>;
export {};
//# sourceMappingURL=team-execution-view-dtos.d.ts.map