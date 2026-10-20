import { z } from "zod";
export declare const agentOrgLaunchConfigurationDtoSchema: z.ZodObject<{
    runtimeKind: z.ZodEnum<{
        autobyteus: "autobyteus";
        claude_agent_sdk: "claude_agent_sdk";
        codex_app_server: "codex_app_server";
        antigravity_cli: "antigravity_cli";
        grok_build: "grok_build";
    }>;
    llmModelIdentifier: z.ZodString;
    llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
    autoExecuteTools: z.ZodBoolean;
    workspaceRootPath: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
type LaunchConfigurationDto = Readonly<z.infer<typeof agentOrgLaunchConfigurationDtoSchema>>;
/**
 * Where an agent's (or a Team's) launch values came from and the configured layers skipped before
 * it; `configured` marks a copy started from a configured placement of the coordinating run. Absent on
 * records written before sources existed ("not recorded").
 */
export declare const collaborationLaunchConfigurationSourceDtoSchema: z.ZodObject<{
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
        }>;
        runtimeKind: z.ZodNullable<z.ZodString>;
        llmModelIdentifier: z.ZodNullable<z.ZodString>;
        reason: z.ZodEnum<{
            incomplete: "incomplete";
            runtime_unavailable: "runtime_unavailable";
            model_unavailable: "model_unavailable";
            model_settings_invalid: "model_settings_invalid";
        }>;
        detail: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type CollaborationLaunchConfigurationSourceDto = Readonly<z.infer<typeof collaborationLaunchConfigurationSourceDtoSchema>>;
/**
 * A Team copy member's launch: the complete launch it started with, and whether a Team-level choice
 * reaches it (`followsTeam`). `launchSource` is present only when its agent definition had a default.
 */
type MemberLaunchDto = Readonly<{
    launchConfiguration: LaunchConfigurationDto;
    followsTeam: boolean;
    launchSource?: CollaborationLaunchConfigurationSourceDto;
}>;
type TeamLaunchDto = Readonly<{
    defaultLaunchConfiguration: LaunchConfigurationDto;
    defaultLaunchSource?: CollaborationLaunchConfigurationSourceDto;
}>;
/** The recorded source of a Team copy member's launch: its own, else its Team's; null when not recorded. */
export declare const collaborationMemberLaunchSource: (team: Pick<TeamLaunchDto, "defaultLaunchSource">, member: Pick<MemberLaunchDto, "launchSource">) => CollaborationLaunchConfigurationSourceDto | null;
/**
 * The user's model choice for one delegated copy: it replaces only the
 * model and its settings. Absent when the user made no choice (every older record).
 */
export declare const userLaunchSelectionDtoSchema: z.ZodObject<{
    llmModelIdentifier: z.ZodString;
    llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
    selectedAt: z.ZodString;
}, z.core.$strict>;
export type UserLaunchSelectionDto = Readonly<z.infer<typeof userLaunchSelectionDtoSchema>>;
/**
 * The single launch rule of a copy agent (mirrors the server's
 * `effectiveCopyAgentLaunch`): its own choice, else (when it follows its Team) the Team's choice,
 * else its started launch. `selected` tells which choice applied.
 */
export declare const collaborationCopyAgentLaunch: (input: Readonly<{
    started: LaunchConfigurationDto;
    followsTeam?: boolean;
    teamSelection?: UserLaunchSelectionDto | null;
    agentSelection?: UserLaunchSelectionDto | null;
}>) => Readonly<{
    launch: LaunchConfigurationDto;
    selected: "agent" | "team" | null;
}>;
/** The snapshot a delegated copy runs with: from the catalog or from a configured placement when it started. */
export type TaskAgentExecutionSourceDto = Readonly<{
    kind: "agent";
    agentDefinitionId: string;
    launchConfiguration: LaunchConfigurationDto;
    launchSource?: CollaborationLaunchConfigurationSourceDto;
}>;
export type TaskTeamExecutionSourceDto = Readonly<{
    kind: "agent_team";
    teamDefinitionId: string;
    coordinatorAddress: string;
    members: readonly (Readonly<{
        address: string;
        agentDefinitionId: string;
    }> & MemberLaunchDto)[];
    handoffs: readonly Readonly<{
        from: string;
        to: string;
        rules: readonly string[];
    }>[];
}> & TeamLaunchDto;
type TaskAgentExecutionDto = Readonly<{
    address: string;
    agentRunId: string;
    platformAgentRunId: string | null;
    /** Absent for children recorded before the delegator was stored. */
    delegatorAgentRunId?: string;
    startedAt: string;
    source: TaskAgentExecutionSourceDto;
    userLaunchSelection?: UserLaunchSelectionDto;
}>;
type TaskTeamAgentExecutionDto = Readonly<{
    address: string;
    agentRunId: string;
    platformAgentRunId: string | null;
    userLaunchSelection?: UserLaunchSelectionDto;
}>;
type TaskTeamExecutionDto = Readonly<{
    address: string;
    teamRunId: string;
    members: readonly TaskTeamAgentExecutionDto[];
    taskExecutions: readonly TaskExecutionDto[];
    /** Absent for children recorded before the delegator was stored. */
    delegatorAgentRunId?: string;
    startedAt: string;
    source: TaskTeamExecutionSourceDto;
    userTeamLaunchSelection?: UserLaunchSelectionDto;
}>;
type TaskExecutionDto = TaskAgentExecutionDto | TaskTeamExecutionDto;
/** Shared by every collaboration root view (Org and Agent roots). */
export declare const taskExecutionDtoSchema: z.ZodType<TaskExecutionDto, unknown, z.core.$ZodTypeInternals<TaskExecutionDto, unknown>>;
export type CollaborationTaskExecutionDto = TaskExecutionDto;
/** Identity of one task execution node (a task Agent or a task Team) of a root's execution tree. */
export declare const taskExecutionReferenceDtoSchema: z.ZodUnion<readonly [z.ZodObject<{
    agentRunId: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    teamRunId: z.ZodString;
}, z.core.$strict>]>;
export type TaskExecutionReferenceDto = Readonly<z.infer<typeof taskExecutionReferenceDtoSchema>>;
/** Task executions whose Task is DONE: the tree keeps them, the Workspaces listing leaves them out. */
export declare const closedTaskExecutionsDtoSchema: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
    agentRunId: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    teamRunId: z.ZodString;
}, z.core.$strict>]>>;
/** Live: these task executions of the root were closed (their Task became DONE). */
export declare const taskExecutionsClosedEventDtoSchema: z.ZodObject<{
    kind: z.ZodLiteral<"task_executions_closed">;
    task_executions: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        agentRunId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        teamRunId: z.ZodString;
    }, z.core.$strict>]>>;
}, z.core.$strict>;
/** Live: these closed task executions were reactivated by their assigner; the listing shows them again. */
export declare const taskExecutionsReopenedEventDtoSchema: z.ZodObject<{
    kind: z.ZodLiteral<"task_executions_reopened">;
    task_executions: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        agentRunId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        teamRunId: z.ZodString;
    }, z.core.$strict>]>>;
}, z.core.$strict>;
/**
 * Live: the user's model choices of these delegated copies were saved (DS-001).
 * Each names one record by its run ID (unique in the tree) with its choice as now recorded.
 */
export declare const delegatedLaunchSelectionsChangedEventDtoSchema: z.ZodObject<{
    kind: z.ZodLiteral<"delegated_launch_selections_changed">;
    selections: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        agentRunId: z.ZodString;
        selection: z.ZodObject<{
            llmModelIdentifier: z.ZodString;
            llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
            selectedAt: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>, z.ZodObject<{
        teamRunId: z.ZodString;
        selection: z.ZodObject<{
            llmModelIdentifier: z.ZodString;
            llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
            selectedAt: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>]>>;
}, z.core.$strict>;
export type DelegatedLaunchSelectionsChangedEventDto = Readonly<z.infer<typeof delegatedLaunchSelectionsChangedEventDtoSchema>>;
/**
 * Live: response text a chat socket coalesced over one content window. Each item is the
 * concatenated text of one agent segment, in order of first appearance. The envelope covers the
 * contiguous root sequences `[change_sequence, change_sequence_through]`, including absorbed
 * identical status repeats; nothing outside that range is regrouped.
 */
export declare const agentPresentationBatchEventDtoSchema: z.ZodObject<{
    kind: z.ZodLiteral<"agent_presentation_batch">;
    items: z.ZodArray<z.ZodObject<{
        member_address: z.ZodString;
        agent_run_id: z.ZodString;
        message: z.ZodObject<{
            type: z.ZodLiteral<"SEGMENT_CONTENT">;
            payload: z.ZodObject<{
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
        }, z.core.$strict>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type AgentPresentationBatchEventDto = Readonly<z.infer<typeof agentPresentationBatchEventDtoSchema>>;
export declare const agentOrgExecutionTreeDtoSchema: z.ZodObject<{
    subjectKind: z.ZodLiteral<"agent_org">;
    createdAt: z.ZodString;
    archivedAt: z.ZodNullable<z.ZodString>;
    applicationBinding: z.ZodNullable<z.ZodObject<{
        applicationId: z.ZodString;
        bindingId: z.ZodString;
    }, z.core.$strict>>;
    handoffs: z.ZodArray<z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
        rules: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
    rootOrg: z.ZodObject<{
        address: z.ZodLiteral<"/">;
        orgDefinitionId: z.ZodString;
        orgDefinitionName: z.ZodString;
        orgRunId: z.ZodString;
        defaultLaunchConfiguration: z.ZodObject<{
            runtimeKind: z.ZodEnum<{
                autobyteus: "autobyteus";
                claude_agent_sdk: "claude_agent_sdk";
                codex_app_server: "codex_app_server";
                antigravity_cli: "antigravity_cli";
                grok_build: "grok_build";
            }>;
            llmModelIdentifier: z.ZodString;
            llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
            autoExecuteTools: z.ZodBoolean;
            workspaceRootPath: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>;
        members: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
            address: z.ZodString;
            agentDefinitionId: z.ZodString;
            role: z.ZodNullable<z.ZodString>;
            description: z.ZodNullable<z.ZodString>;
            agentRunId: z.ZodString;
            platformAgentRunId: z.ZodNullable<z.ZodString>;
            launchConfiguration: z.ZodObject<{
                runtimeKind: z.ZodEnum<{
                    autobyteus: "autobyteus";
                    claude_agent_sdk: "claude_agent_sdk";
                    codex_app_server: "codex_app_server";
                    antigravity_cli: "antigravity_cli";
                    grok_build: "grok_build";
                }>;
                llmModelIdentifier: z.ZodString;
                llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
                autoExecuteTools: z.ZodBoolean;
                workspaceRootPath: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            address: z.ZodString;
            teamDefinitionId: z.ZodString;
            role: z.ZodNullable<z.ZodString>;
            description: z.ZodNullable<z.ZodString>;
            teamRunId: z.ZodString;
            coordinatorAddress: z.ZodString;
            defaultLaunchConfiguration: z.ZodObject<{
                runtimeKind: z.ZodEnum<{
                    autobyteus: "autobyteus";
                    claude_agent_sdk: "claude_agent_sdk";
                    codex_app_server: "codex_app_server";
                    antigravity_cli: "antigravity_cli";
                    grok_build: "grok_build";
                }>;
                llmModelIdentifier: z.ZodString;
                llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
                autoExecuteTools: z.ZodBoolean;
                workspaceRootPath: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            members: z.ZodArray<z.ZodObject<{
                address: z.ZodString;
                agentDefinitionId: z.ZodString;
                role: z.ZodNullable<z.ZodString>;
                description: z.ZodNullable<z.ZodString>;
                agentRunId: z.ZodString;
                platformAgentRunId: z.ZodNullable<z.ZodString>;
                launchConfiguration: z.ZodObject<{
                    runtimeKind: z.ZodEnum<{
                        autobyteus: "autobyteus";
                        claude_agent_sdk: "claude_agent_sdk";
                        codex_app_server: "codex_app_server";
                        antigravity_cli: "antigravity_cli";
                        grok_build: "grok_build";
                    }>;
                    llmModelIdentifier: z.ZodString;
                    llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
                    autoExecuteTools: z.ZodBoolean;
                    workspaceRootPath: z.ZodNullable<z.ZodString>;
                }, z.core.$strict>;
            }, z.core.$strict>>;
            taskExecutions: z.ZodArray<z.ZodType<TaskExecutionDto, unknown, z.core.$ZodTypeInternals<TaskExecutionDto, unknown>>>;
        }, z.core.$strict>]>>;
        taskExecutions: z.ZodArray<z.ZodType<TaskExecutionDto, unknown, z.core.$ZodTypeInternals<TaskExecutionDto, unknown>>>;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const agentOrgCommunicationMessageDtoSchema: z.ZodObject<{
    messageId: z.ZodString;
    senderAgentRunId: z.ZodString;
    receiverAgentRunId: z.ZodString;
    content: z.ZodString;
    messageType: z.ZodString;
    referenceFiles: z.ZodArray<z.ZodString>;
    createdAt: z.ZodString;
}, z.core.$strict>;
export declare const agentOrgCommunicationMessagesDtoSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    subjectKind: z.ZodLiteral<"agent_org">;
    orgRunId: z.ZodString;
    messages: z.ZodArray<z.ZodObject<{
        messageId: z.ZodString;
        senderAgentRunId: z.ZodString;
        receiverAgentRunId: z.ZodString;
        content: z.ZodString;
        messageType: z.ZodString;
        referenceFiles: z.ZodArray<z.ZodString>;
        createdAt: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const agentOrgAgentStatusDtoSchema: z.ZodObject<{
    member_address: z.ZodString;
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
export declare const agentOrgExecutionViewDtoSchema: z.ZodObject<{
    base_change_sequence: z.ZodNumber;
    is_active: z.ZodBoolean;
    execution_tree: z.ZodObject<{
        subjectKind: z.ZodLiteral<"agent_org">;
        createdAt: z.ZodString;
        archivedAt: z.ZodNullable<z.ZodString>;
        applicationBinding: z.ZodNullable<z.ZodObject<{
            applicationId: z.ZodString;
            bindingId: z.ZodString;
        }, z.core.$strict>>;
        handoffs: z.ZodArray<z.ZodObject<{
            from: z.ZodString;
            to: z.ZodString;
            rules: z.ZodArray<z.ZodString>;
        }, z.core.$strict>>;
        rootOrg: z.ZodObject<{
            address: z.ZodLiteral<"/">;
            orgDefinitionId: z.ZodString;
            orgDefinitionName: z.ZodString;
            orgRunId: z.ZodString;
            defaultLaunchConfiguration: z.ZodObject<{
                runtimeKind: z.ZodEnum<{
                    autobyteus: "autobyteus";
                    claude_agent_sdk: "claude_agent_sdk";
                    codex_app_server: "codex_app_server";
                    antigravity_cli: "antigravity_cli";
                    grok_build: "grok_build";
                }>;
                llmModelIdentifier: z.ZodString;
                llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
                autoExecuteTools: z.ZodBoolean;
                workspaceRootPath: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>;
            members: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
                address: z.ZodString;
                agentDefinitionId: z.ZodString;
                role: z.ZodNullable<z.ZodString>;
                description: z.ZodNullable<z.ZodString>;
                agentRunId: z.ZodString;
                platformAgentRunId: z.ZodNullable<z.ZodString>;
                launchConfiguration: z.ZodObject<{
                    runtimeKind: z.ZodEnum<{
                        autobyteus: "autobyteus";
                        claude_agent_sdk: "claude_agent_sdk";
                        codex_app_server: "codex_app_server";
                        antigravity_cli: "antigravity_cli";
                        grok_build: "grok_build";
                    }>;
                    llmModelIdentifier: z.ZodString;
                    llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
                    autoExecuteTools: z.ZodBoolean;
                    workspaceRootPath: z.ZodNullable<z.ZodString>;
                }, z.core.$strict>;
            }, z.core.$strict>, z.ZodObject<{
                address: z.ZodString;
                teamDefinitionId: z.ZodString;
                role: z.ZodNullable<z.ZodString>;
                description: z.ZodNullable<z.ZodString>;
                teamRunId: z.ZodString;
                coordinatorAddress: z.ZodString;
                defaultLaunchConfiguration: z.ZodObject<{
                    runtimeKind: z.ZodEnum<{
                        autobyteus: "autobyteus";
                        claude_agent_sdk: "claude_agent_sdk";
                        codex_app_server: "codex_app_server";
                        antigravity_cli: "antigravity_cli";
                        grok_build: "grok_build";
                    }>;
                    llmModelIdentifier: z.ZodString;
                    llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
                    autoExecuteTools: z.ZodBoolean;
                    workspaceRootPath: z.ZodNullable<z.ZodString>;
                }, z.core.$strict>;
                members: z.ZodArray<z.ZodObject<{
                    address: z.ZodString;
                    agentDefinitionId: z.ZodString;
                    role: z.ZodNullable<z.ZodString>;
                    description: z.ZodNullable<z.ZodString>;
                    agentRunId: z.ZodString;
                    platformAgentRunId: z.ZodNullable<z.ZodString>;
                    launchConfiguration: z.ZodObject<{
                        runtimeKind: z.ZodEnum<{
                            autobyteus: "autobyteus";
                            claude_agent_sdk: "claude_agent_sdk";
                            codex_app_server: "codex_app_server";
                            antigravity_cli: "antigravity_cli";
                            grok_build: "grok_build";
                        }>;
                        llmModelIdentifier: z.ZodString;
                        llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
                        autoExecuteTools: z.ZodBoolean;
                        workspaceRootPath: z.ZodNullable<z.ZodString>;
                    }, z.core.$strict>;
                }, z.core.$strict>>;
                taskExecutions: z.ZodArray<z.ZodType<TaskExecutionDto, unknown, z.core.$ZodTypeInternals<TaskExecutionDto, unknown>>>;
            }, z.core.$strict>]>>;
            taskExecutions: z.ZodArray<z.ZodType<TaskExecutionDto, unknown, z.core.$ZodTypeInternals<TaskExecutionDto, unknown>>>;
        }, z.core.$strict>;
    }, z.core.$strict>;
    closed_task_executions: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        agentRunId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        teamRunId: z.ZodString;
    }, z.core.$strict>]>>;
    communication_messages: z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        subjectKind: z.ZodLiteral<"agent_org">;
        orgRunId: z.ZodString;
        messages: z.ZodArray<z.ZodObject<{
            messageId: z.ZodString;
            senderAgentRunId: z.ZodString;
            receiverAgentRunId: z.ZodString;
            content: z.ZodString;
            messageType: z.ZodString;
            referenceFiles: z.ZodArray<z.ZodString>;
            createdAt: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    agent_statuses: z.ZodArray<z.ZodObject<{
        member_address: z.ZodString;
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
    }, z.core.$strict>>;
    agent_input_states: z.ZodArray<z.ZodObject<{
        agent_run_id: z.ZodString;
        state: z.ZodObject<{
            run_instance_id: z.ZodString;
            revision: z.ZodNumber;
            entries: z.ZodArray<z.ZodObject<{
                sequence: z.ZodNumber;
                message_id: z.ZodNullable<z.ZodString>;
                dedupe_key: z.ZodNullable<z.ZodString>;
                turn_id: z.ZodNullable<z.ZodString>;
                state: z.ZodEnum<{
                    queued: "queued";
                    held: "held";
                    forwarded: "forwarded";
                }>;
                content: z.ZodString;
                sender_type: z.ZodEnum<{
                    user: "user";
                    agent: "agent";
                    system: "system";
                }>;
                file_attachments: z.ZodArray<z.ZodObject<{
                    uri: z.ZodString;
                    file_type: z.ZodString;
                    file_name: z.ZodNullable<z.ZodString>;
                }, z.core.$strict>>;
            }, z.core.$strict>>;
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
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const agentOrgExecutionEventDtoSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"agent_presentation">;
    member_address: z.ZodString;
    agent_run_id: z.ZodString;
    message: z.ZodType<import("@autobyteus/agent-presentation-contracts").AgentPresentationMessage, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").AgentPresentationMessage, unknown>>;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"agent_presentation_batch">;
    items: z.ZodArray<z.ZodObject<{
        member_address: z.ZodString;
        agent_run_id: z.ZodString;
        message: z.ZodObject<{
            type: z.ZodLiteral<"SEGMENT_CONTENT">;
            payload: z.ZodObject<{
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
        }, z.core.$strict>;
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"task_execution_started">;
    host_kind: z.ZodEnum<{
        team: "team";
        root: "root";
    }>;
    host_run_id: z.ZodString;
    execution: z.ZodType<TaskExecutionDto, unknown, z.core.$ZodTypeInternals<TaskExecutionDto, unknown>>;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"communication">;
    message: z.ZodObject<{
        messageId: z.ZodString;
        senderAgentRunId: z.ZodString;
        receiverAgentRunId: z.ZodString;
        content: z.ZodString;
        messageType: z.ZodString;
        referenceFiles: z.ZodArray<z.ZodString>;
        createdAt: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"task_executions_closed">;
    task_executions: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        agentRunId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        teamRunId: z.ZodString;
    }, z.core.$strict>]>>;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"task_executions_reopened">;
    task_executions: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        agentRunId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        teamRunId: z.ZodString;
    }, z.core.$strict>]>>;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"delegated_launch_selections_changed">;
    selections: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        agentRunId: z.ZodString;
        selection: z.ZodObject<{
            llmModelIdentifier: z.ZodString;
            llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
            selectedAt: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>, z.ZodObject<{
        teamRunId: z.ZodString;
        selection: z.ZodObject<{
            llmModelIdentifier: z.ZodString;
            llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
            selectedAt: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>]>>;
}, z.core.$strict>], "kind">;
export type AgentOrgExecutionTreeDto = Readonly<z.infer<typeof agentOrgExecutionTreeDtoSchema>>;
export type AgentOrgExecutionViewDto = Readonly<z.infer<typeof agentOrgExecutionViewDtoSchema>>;
export type AgentOrgExecutionEventDto = Readonly<z.infer<typeof agentOrgExecutionEventDtoSchema>>;
export type AgentOrgCommunicationMessageDto = Readonly<z.infer<typeof agentOrgCommunicationMessageDtoSchema>>;
export {};
//# sourceMappingURL=agent-org-execution-dtos.d.ts.map