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
type TaskAgentExecutionDto = Readonly<{
    address: string;
    agentRunId: string;
    platformAgentRunId: string | null;
    /** Absent for children recorded before the delegator was stored. */
    delegatorAgentRunId?: string;
    startedAt: string;
}>;
type TaskTeamAgentExecutionDto = Readonly<{
    address: string;
    agentRunId: string;
    platformAgentRunId: string | null;
}>;
type TaskTeamNestedExecutionDto = Readonly<{
    address: string;
    teamRunId: string;
    members: readonly TaskTeamMemberExecutionDto[];
    taskExecutions: readonly TaskExecutionDto[];
}>;
type TaskTeamMemberExecutionDto = TaskTeamAgentExecutionDto | TaskTeamNestedExecutionDto;
type TaskTeamExecutionDto = Readonly<{
    address: string;
    teamRunId: string;
    members: readonly TaskTeamMemberExecutionDto[];
    taskExecutions: readonly TaskExecutionDto[];
    /** Absent for children recorded before the delegator was stored. */
    delegatorAgentRunId?: string;
    startedAt: string;
}>;
type TaskExecutionDto = TaskAgentExecutionDto | TaskTeamExecutionDto;
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
    kind: z.ZodLiteral<"task_execution_started">;
    host_kind: z.ZodEnum<{
        root: "root";
        team: "team";
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
}, z.core.$strict>], "kind">;
export type AgentOrgExecutionTreeDto = Readonly<z.infer<typeof agentOrgExecutionTreeDtoSchema>>;
export type AgentOrgExecutionViewDto = Readonly<z.infer<typeof agentOrgExecutionViewDtoSchema>>;
export type AgentOrgExecutionEventDto = Readonly<z.infer<typeof agentOrgExecutionEventDtoSchema>>;
export type AgentOrgCommunicationMessageDto = Readonly<z.infer<typeof agentOrgCommunicationMessageDtoSchema>>;
export {};
//# sourceMappingURL=agent-org-execution-dtos.d.ts.map