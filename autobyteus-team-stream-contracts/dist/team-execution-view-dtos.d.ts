import { z } from "zod";
export declare const agentTeamAddressDtoSchema: z.ZodString;
export declare const teamMemberExecutionIdentityDtoSchema: z.ZodObject<{
    agent_run_id: z.ZodString;
    member_address: z.ZodString;
}, z.core.$strict>;
export type AgentLaunchConfigurationDto = Readonly<{
    runtime_kind: "autobyteus" | "claude_agent_sdk" | "codex_app_server" | "antigravity_cli" | "grok_build" | "deepseek_harness";
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
    /** A member removed from the team that is still finishing its turn: shown as leaving until it stops. */
    leaving?: true;
}>;
/** A Team run's own tree: its members. The runs it delegated are its tree's rows (`RUN_TREE_SNAPSHOT`, autobyteus-461 SR-084). */
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
        members: readonly ConfiguredAgentExecutionDto[];
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
    background_tasks_running: z.ZodNumber;
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
//# sourceMappingURL=team-execution-view-dtos.d.ts.map