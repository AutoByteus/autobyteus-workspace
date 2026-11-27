import { z } from "zod";
export declare const agentOrgLaunchConfigurationDtoSchema: z.ZodObject<{
    runtimeKind: z.ZodEnum<{
        autobyteus: "autobyteus";
        claude_agent_sdk: "claude_agent_sdk";
        codex_app_server: "codex_app_server";
        antigravity_cli: "antigravity_cli";
        grok_build: "grok_build";
        deepseek_harness: "deepseek_harness";
    }>;
    llmModelIdentifier: z.ZodString;
    llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
    autoExecuteTools: z.ZodBoolean;
    workspaceRootPath: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
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
                occurred_at: z.ZodISODateTime;
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
                deepseek_harness: "deepseek_harness";
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
                    deepseek_harness: "deepseek_harness";
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
                    deepseek_harness: "deepseek_harness";
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
                        deepseek_harness: "deepseek_harness";
                    }>;
                    llmModelIdentifier: z.ZodString;
                    llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
                    autoExecuteTools: z.ZodBoolean;
                    workspaceRootPath: z.ZodNullable<z.ZodString>;
                }, z.core.$strict>;
            }, z.core.$strict>>;
        }, z.core.$strict>]>>;
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
export declare const agentOrgExecutionViewDtoSchema: z.ZodObject<{
    base_change_sequence: z.ZodNumber;
    is_active: z.ZodBoolean;
    live_sequence_id: z.ZodNullable<z.ZodString>;
    last_message_change_sequence: z.ZodNullable<z.ZodNumber>;
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
                    deepseek_harness: "deepseek_harness";
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
                        deepseek_harness: "deepseek_harness";
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
                        deepseek_harness: "deepseek_harness";
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
                            deepseek_harness: "deepseek_harness";
                        }>;
                        llmModelIdentifier: z.ZodString;
                        llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
                        autoExecuteTools: z.ZodBoolean;
                        workspaceRootPath: z.ZodNullable<z.ZodString>;
                    }, z.core.$strict>;
                }, z.core.$strict>>;
            }, z.core.$strict>]>>;
        }, z.core.$strict>;
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
                accepted_at: z.ZodISODateTime;
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
                occurred_at: z.ZodISODateTime;
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
    added: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        parentKey: z.ZodNullable<z.ZodString>;
        depth: z.ZodNumber;
        kind: z.ZodEnum<{
            agent: "agent";
            team: "team";
            team_member: "team_member";
            org_agent: "org_agent";
            org_team: "org_team";
            peer_agent: "peer_agent";
            peer_team: "peer_team";
            peer_member: "peer_member";
        }>;
        name: z.ZodString;
        address: z.ZodNullable<z.ZodString>;
        openTarget: z.ZodNullable<z.ZodObject<{
            runKind: z.ZodEnum<{
                agent: "agent";
                agent_team: "agent_team";
                agent_org: "agent_org";
            }>;
            runId: z.ZodString;
            agentRunId: z.ZodString;
            nodeId: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        statusIds: z.ZodArray<z.ZodString>;
        launch: z.ZodOptional<z.ZodObject<{
            runtimeKind: z.ZodString;
            llmModelIdentifier: z.ZodString;
            llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
            autoExecuteTools: z.ZodNullable<z.ZodBoolean>;
            workspaceRootPath: z.ZodNullable<z.ZodString>;
            source: z.ZodNullable<z.ZodUnion<readonly [z.ZodObject<{
                origin: z.ZodEnum<{
                    agent_default: "agent_default";
                    team_default: "team_default";
                    agent_history: "agent_history";
                    node_fallback: "node_fallback";
                    inherited: "inherited";
                    configured: "configured";
                    settings: "settings";
                }>;
                fallbacks: z.ZodArray<z.ZodObject<{
                    layer: z.ZodEnum<{
                        agent_default: "agent_default";
                        team_default: "team_default";
                        model_router: "model_router";
                    }>;
                    runtimeKind: z.ZodNullable<z.ZodString>;
                    llmModelIdentifier: z.ZodNullable<z.ZodString>;
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
                    runtimeKind: z.ZodNullable<z.ZodString>;
                    llmModelIdentifier: z.ZodNullable<z.ZodString>;
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
                choiceReason: z.ZodString;
                taskKind: z.ZodString;
            }, z.core.$strict>]>>;
            ownSource: z.ZodBoolean;
        }, z.core.$strict>>;
        peer: z.ZodOptional<z.ZodObject<{
            nodeId: z.ZodString;
            nodeName: z.ZodString;
            title: z.ZodNullable<z.ZodString>;
            reachable: z.ZodNullable<z.ZodBoolean>;
        }, z.core.$strict>>;
        leaving: z.ZodOptional<z.ZodLiteral<true>>;
    }, z.core.$strict>>;
    removed: z.ZodArray<z.ZodString>;
    updated: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        parentKey: z.ZodNullable<z.ZodString>;
        depth: z.ZodNumber;
        kind: z.ZodEnum<{
            agent: "agent";
            team: "team";
            team_member: "team_member";
            org_agent: "org_agent";
            org_team: "org_team";
            peer_agent: "peer_agent";
            peer_team: "peer_team";
            peer_member: "peer_member";
        }>;
        name: z.ZodString;
        address: z.ZodNullable<z.ZodString>;
        openTarget: z.ZodNullable<z.ZodObject<{
            runKind: z.ZodEnum<{
                agent: "agent";
                agent_team: "agent_team";
                agent_org: "agent_org";
            }>;
            runId: z.ZodString;
            agentRunId: z.ZodString;
            nodeId: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        statusIds: z.ZodArray<z.ZodString>;
        launch: z.ZodOptional<z.ZodObject<{
            runtimeKind: z.ZodString;
            llmModelIdentifier: z.ZodString;
            llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
            autoExecuteTools: z.ZodNullable<z.ZodBoolean>;
            workspaceRootPath: z.ZodNullable<z.ZodString>;
            source: z.ZodNullable<z.ZodUnion<readonly [z.ZodObject<{
                origin: z.ZodEnum<{
                    agent_default: "agent_default";
                    team_default: "team_default";
                    agent_history: "agent_history";
                    node_fallback: "node_fallback";
                    inherited: "inherited";
                    configured: "configured";
                    settings: "settings";
                }>;
                fallbacks: z.ZodArray<z.ZodObject<{
                    layer: z.ZodEnum<{
                        agent_default: "agent_default";
                        team_default: "team_default";
                        model_router: "model_router";
                    }>;
                    runtimeKind: z.ZodNullable<z.ZodString>;
                    llmModelIdentifier: z.ZodNullable<z.ZodString>;
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
                    runtimeKind: z.ZodNullable<z.ZodString>;
                    llmModelIdentifier: z.ZodNullable<z.ZodString>;
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
                choiceReason: z.ZodString;
                taskKind: z.ZodString;
            }, z.core.$strict>]>>;
            ownSource: z.ZodBoolean;
        }, z.core.$strict>>;
        peer: z.ZodOptional<z.ZodObject<{
            nodeId: z.ZodString;
            nodeName: z.ZodString;
            title: z.ZodNullable<z.ZodString>;
            reachable: z.ZodNullable<z.ZodBoolean>;
        }, z.core.$strict>>;
        leaving: z.ZodOptional<z.ZodLiteral<true>>;
    }, z.core.$strict>>;
    kind: z.ZodLiteral<"run_tree_changed">;
}, z.core.$strict>], "kind">;
export type AgentOrgExecutionTreeDto = Readonly<z.infer<typeof agentOrgExecutionTreeDtoSchema>>;
export type AgentOrgExecutionViewDto = Readonly<z.infer<typeof agentOrgExecutionViewDtoSchema>>;
export type AgentOrgExecutionEventDto = Readonly<z.infer<typeof agentOrgExecutionEventDtoSchema>>;
export type AgentOrgCommunicationMessageDto = Readonly<z.infer<typeof agentOrgCommunicationMessageDtoSchema>>;
//# sourceMappingURL=agent-org-execution-dtos.d.ts.map