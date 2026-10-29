import { z } from "zod";
export declare const AgentTeamRootExecutionViewDtoSchema: z.ZodObject<{
    root_subject_kind: z.ZodLiteral<"agent_team">;
    root_run_id: z.ZodString;
    root_team: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strict>;
export declare const AgentOrgRootExecutionViewDtoSchema: z.ZodObject<{
    root_subject_kind: z.ZodLiteral<"agent_org">;
    root_run_id: z.ZodString;
    root_org: z.ZodObject<{
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
                    taskExecutions: z.ZodArray<z.ZodType<Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        delegatorAgentRunId?: string;
                        startedAt: string;
                        source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                        userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }> | Readonly<{
                        address: string;
                        teamRunId: string;
                        members: readonly Readonly<{
                            address: string;
                            agentRunId: string;
                            platformAgentRunId: string | null;
                            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                        }>[];
                        taskExecutions: readonly (Readonly<{
                            address: string;
                            agentRunId: string;
                            platformAgentRunId: string | null;
                            delegatorAgentRunId?: string;
                            startedAt: string;
                            source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                        }> | Readonly</*elided*/ any>)[];
                        delegatorAgentRunId?: string;
                        startedAt: string;
                        source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
                        userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }>, unknown, z.core.$ZodTypeInternals<Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        delegatorAgentRunId?: string;
                        startedAt: string;
                        source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                        userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }> | Readonly<{
                        address: string;
                        teamRunId: string;
                        members: readonly Readonly<{
                            address: string;
                            agentRunId: string;
                            platformAgentRunId: string | null;
                            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                        }>[];
                        taskExecutions: readonly (Readonly<{
                            address: string;
                            agentRunId: string;
                            platformAgentRunId: string | null;
                            delegatorAgentRunId?: string;
                            startedAt: string;
                            source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                        }> | Readonly</*elided*/ any>)[];
                        delegatorAgentRunId?: string;
                        startedAt: string;
                        source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
                        userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }>, unknown>>>;
                }, z.core.$strict>]>>;
                taskExecutions: z.ZodArray<z.ZodType<Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    delegatorAgentRunId?: string;
                    startedAt: string;
                    source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                    userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }> | Readonly<{
                    address: string;
                    teamRunId: string;
                    members: readonly Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }>[];
                    taskExecutions: readonly (Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        delegatorAgentRunId?: string;
                        startedAt: string;
                        source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                        userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }> | Readonly</*elided*/ any>)[];
                    delegatorAgentRunId?: string;
                    startedAt: string;
                    source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
                    userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }>, unknown, z.core.$ZodTypeInternals<Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    delegatorAgentRunId?: string;
                    startedAt: string;
                    source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                    userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }> | Readonly<{
                    address: string;
                    teamRunId: string;
                    members: readonly Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }>[];
                    taskExecutions: readonly (Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        delegatorAgentRunId?: string;
                        startedAt: string;
                        source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                        userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }> | Readonly</*elided*/ any>)[];
                    delegatorAgentRunId?: string;
                    startedAt: string;
                    source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
                    userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }>, unknown>>>;
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
        remote_task_executions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
        }, z.core.$strict>], "kind">>;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const AgentRootExecutionViewDtoSchema: z.ZodObject<{
    root_subject_kind: z.ZodLiteral<"agent">;
    root_run_id: z.ZodString;
    root_agent: z.ZodObject<{
        base_change_sequence: z.ZodNumber;
        is_active: z.ZodBoolean;
        execution_tree: z.ZodObject<{
            subjectKind: z.ZodLiteral<"agent">;
            createdAt: z.ZodString;
            host: z.ZodObject<{
                address: z.ZodString;
                agentRunId: z.ZodString;
                agentDefinitionId: z.ZodString;
            }, z.core.$strict>;
            taskExecutions: z.ZodArray<z.ZodType<Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
                source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }> | Readonly<{
                address: string;
                teamRunId: string;
                members: readonly Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }>[];
                taskExecutions: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    delegatorAgentRunId?: string;
                    startedAt: string;
                    source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                    userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }> | Readonly</*elided*/ any>)[];
                delegatorAgentRunId?: string;
                startedAt: string;
                source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
                userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }>, unknown, z.core.$ZodTypeInternals<Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
                source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }> | Readonly<{
                address: string;
                teamRunId: string;
                members: readonly Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }>[];
                taskExecutions: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    delegatorAgentRunId?: string;
                    startedAt: string;
                    source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                    userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }> | Readonly</*elided*/ any>)[];
                delegatorAgentRunId?: string;
                startedAt: string;
                source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
                userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }>, unknown>>>;
        }, z.core.$strict>;
        closed_task_executions: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
            agentRunId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            teamRunId: z.ZodString;
        }, z.core.$strict>]>>;
        communication_messages: z.ZodObject<{
            schemaVersion: z.ZodLiteral<1>;
            subjectKind: z.ZodLiteral<"agent">;
            hostRunId: z.ZodString;
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
        remote_task_executions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
        }, z.core.$strict>], "kind">>;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const RootExecutionViewDtoSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    root_subject_kind: z.ZodLiteral<"agent_team">;
    root_run_id: z.ZodString;
    root_team: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strict>, z.ZodObject<{
    root_subject_kind: z.ZodLiteral<"agent_org">;
    root_run_id: z.ZodString;
    root_org: z.ZodObject<{
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
                    taskExecutions: z.ZodArray<z.ZodType<Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        delegatorAgentRunId?: string;
                        startedAt: string;
                        source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                        userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }> | Readonly<{
                        address: string;
                        teamRunId: string;
                        members: readonly Readonly<{
                            address: string;
                            agentRunId: string;
                            platformAgentRunId: string | null;
                            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                        }>[];
                        taskExecutions: readonly (Readonly<{
                            address: string;
                            agentRunId: string;
                            platformAgentRunId: string | null;
                            delegatorAgentRunId?: string;
                            startedAt: string;
                            source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                        }> | Readonly</*elided*/ any>)[];
                        delegatorAgentRunId?: string;
                        startedAt: string;
                        source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
                        userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }>, unknown, z.core.$ZodTypeInternals<Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        delegatorAgentRunId?: string;
                        startedAt: string;
                        source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                        userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }> | Readonly<{
                        address: string;
                        teamRunId: string;
                        members: readonly Readonly<{
                            address: string;
                            agentRunId: string;
                            platformAgentRunId: string | null;
                            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                        }>[];
                        taskExecutions: readonly (Readonly<{
                            address: string;
                            agentRunId: string;
                            platformAgentRunId: string | null;
                            delegatorAgentRunId?: string;
                            startedAt: string;
                            source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                        }> | Readonly</*elided*/ any>)[];
                        delegatorAgentRunId?: string;
                        startedAt: string;
                        source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
                        userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }>, unknown>>>;
                }, z.core.$strict>]>>;
                taskExecutions: z.ZodArray<z.ZodType<Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    delegatorAgentRunId?: string;
                    startedAt: string;
                    source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                    userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }> | Readonly<{
                    address: string;
                    teamRunId: string;
                    members: readonly Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }>[];
                    taskExecutions: readonly (Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        delegatorAgentRunId?: string;
                        startedAt: string;
                        source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                        userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }> | Readonly</*elided*/ any>)[];
                    delegatorAgentRunId?: string;
                    startedAt: string;
                    source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
                    userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }>, unknown, z.core.$ZodTypeInternals<Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    delegatorAgentRunId?: string;
                    startedAt: string;
                    source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                    userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }> | Readonly<{
                    address: string;
                    teamRunId: string;
                    members: readonly Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }>[];
                    taskExecutions: readonly (Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        delegatorAgentRunId?: string;
                        startedAt: string;
                        source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                        userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }> | Readonly</*elided*/ any>)[];
                    delegatorAgentRunId?: string;
                    startedAt: string;
                    source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
                    userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }>, unknown>>>;
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
        remote_task_executions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
        }, z.core.$strict>], "kind">>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    root_subject_kind: z.ZodLiteral<"agent">;
    root_run_id: z.ZodString;
    root_agent: z.ZodObject<{
        base_change_sequence: z.ZodNumber;
        is_active: z.ZodBoolean;
        execution_tree: z.ZodObject<{
            subjectKind: z.ZodLiteral<"agent">;
            createdAt: z.ZodString;
            host: z.ZodObject<{
                address: z.ZodString;
                agentRunId: z.ZodString;
                agentDefinitionId: z.ZodString;
            }, z.core.$strict>;
            taskExecutions: z.ZodArray<z.ZodType<Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
                source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }> | Readonly<{
                address: string;
                teamRunId: string;
                members: readonly Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }>[];
                taskExecutions: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    delegatorAgentRunId?: string;
                    startedAt: string;
                    source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                    userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }> | Readonly</*elided*/ any>)[];
                delegatorAgentRunId?: string;
                startedAt: string;
                source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
                userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }>, unknown, z.core.$ZodTypeInternals<Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
                source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }> | Readonly<{
                address: string;
                teamRunId: string;
                members: readonly Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }>[];
                taskExecutions: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    delegatorAgentRunId?: string;
                    startedAt: string;
                    source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                    userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }> | Readonly</*elided*/ any>)[];
                delegatorAgentRunId?: string;
                startedAt: string;
                source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
                userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }>, unknown>>>;
        }, z.core.$strict>;
        closed_task_executions: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
            agentRunId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            teamRunId: z.ZodString;
        }, z.core.$strict>]>>;
        communication_messages: z.ZodObject<{
            schemaVersion: z.ZodLiteral<1>;
            subjectKind: z.ZodLiteral<"agent">;
            hostRunId: z.ZodString;
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
        remote_task_executions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
        }, z.core.$strict>], "kind">>;
    }, z.core.$strict>;
}, z.core.$strict>], "root_subject_kind">;
/**
 * One root event, or a batch covering the contiguous root sequences
 * `[change_sequence, change_sequence_through]`. `change_sequence_through` is required with and only
 * allowed with the `agent_presentation_batch` event kind.
 */
export declare const RootExecutionEventDtoSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    root_subject_kind: z.ZodLiteral<"agent_team">;
    root_run_id: z.ZodString;
    change_sequence: z.ZodNumber;
    event: z.ZodUnknown;
}, z.core.$strict>, z.ZodObject<{
    root_subject_kind: z.ZodLiteral<"agent_org">;
    root_run_id: z.ZodString;
    change_sequence: z.ZodNumber;
    change_sequence_through: z.ZodOptional<z.ZodNumber>;
    event: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
        execution: z.ZodType<Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            delegatorAgentRunId?: string;
            startedAt: string;
            source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
        }> | Readonly<{
            address: string;
            teamRunId: string;
            members: readonly Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }>[];
            taskExecutions: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
                source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }> | Readonly</*elided*/ any>)[];
            delegatorAgentRunId?: string;
            startedAt: string;
            source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
            userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
        }>, unknown, z.core.$ZodTypeInternals<Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            delegatorAgentRunId?: string;
            startedAt: string;
            source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
        }> | Readonly<{
            address: string;
            teamRunId: string;
            members: readonly Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }>[];
            taskExecutions: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
                source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }> | Readonly</*elided*/ any>)[];
            delegatorAgentRunId?: string;
            startedAt: string;
            source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
            userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
        }>, unknown>>;
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
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"remote_task_execution_started">;
        execution: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
    }, z.core.$strict>, z.ZodObject<{
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
        kind: z.ZodLiteral<"remote_task_execution_summary">;
    }, z.core.$strict>], "kind">;
}, z.core.$strict>, z.ZodObject<{
    root_subject_kind: z.ZodLiteral<"agent">;
    root_run_id: z.ZodString;
    change_sequence: z.ZodNumber;
    change_sequence_through: z.ZodOptional<z.ZodNumber>;
    event: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
        execution: z.ZodType<Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            delegatorAgentRunId?: string;
            startedAt: string;
            source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
        }> | Readonly<{
            address: string;
            teamRunId: string;
            members: readonly Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }>[];
            taskExecutions: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
                source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }> | Readonly</*elided*/ any>)[];
            delegatorAgentRunId?: string;
            startedAt: string;
            source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
            userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
        }>, unknown, z.core.$ZodTypeInternals<Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            delegatorAgentRunId?: string;
            startedAt: string;
            source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
        }> | Readonly<{
            address: string;
            teamRunId: string;
            members: readonly Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }>[];
            taskExecutions: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
                source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }> | Readonly</*elided*/ any>)[];
            delegatorAgentRunId?: string;
            startedAt: string;
            source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
            userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
        }>, unknown>>;
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
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"remote_task_execution_started">;
        execution: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
    }, z.core.$strict>, z.ZodObject<{
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
        kind: z.ZodLiteral<"remote_task_execution_summary">;
    }, z.core.$strict>], "kind">;
}, z.core.$strict>], "root_subject_kind">;
export declare const CollaborationStreamServerMessageSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"CONNECTED">;
    payload: z.ZodObject<{
        root_subject_kind: z.ZodEnum<{
            agent: "agent";
            agent_team: "agent_team";
            agent_org: "agent_org";
        }>;
        root_run_id: z.ZodString;
        session_id: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"ROOT_EXECUTION_VIEW_SNAPSHOT">;
    payload: z.ZodDiscriminatedUnion<[z.ZodObject<{
        root_subject_kind: z.ZodLiteral<"agent_team">;
        root_run_id: z.ZodString;
        root_team: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strict>, z.ZodObject<{
        root_subject_kind: z.ZodLiteral<"agent_org">;
        root_run_id: z.ZodString;
        root_org: z.ZodObject<{
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
                        taskExecutions: z.ZodArray<z.ZodType<Readonly<{
                            address: string;
                            agentRunId: string;
                            platformAgentRunId: string | null;
                            delegatorAgentRunId?: string;
                            startedAt: string;
                            source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                        }> | Readonly<{
                            address: string;
                            teamRunId: string;
                            members: readonly Readonly<{
                                address: string;
                                agentRunId: string;
                                platformAgentRunId: string | null;
                                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                            }>[];
                            taskExecutions: readonly (Readonly<{
                                address: string;
                                agentRunId: string;
                                platformAgentRunId: string | null;
                                delegatorAgentRunId?: string;
                                startedAt: string;
                                source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                            }> | Readonly</*elided*/ any>)[];
                            delegatorAgentRunId?: string;
                            startedAt: string;
                            source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
                            userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                        }>, unknown, z.core.$ZodTypeInternals<Readonly<{
                            address: string;
                            agentRunId: string;
                            platformAgentRunId: string | null;
                            delegatorAgentRunId?: string;
                            startedAt: string;
                            source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                        }> | Readonly<{
                            address: string;
                            teamRunId: string;
                            members: readonly Readonly<{
                                address: string;
                                agentRunId: string;
                                platformAgentRunId: string | null;
                                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                            }>[];
                            taskExecutions: readonly (Readonly<{
                                address: string;
                                agentRunId: string;
                                platformAgentRunId: string | null;
                                delegatorAgentRunId?: string;
                                startedAt: string;
                                source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                            }> | Readonly</*elided*/ any>)[];
                            delegatorAgentRunId?: string;
                            startedAt: string;
                            source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
                            userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                        }>, unknown>>>;
                    }, z.core.$strict>]>>;
                    taskExecutions: z.ZodArray<z.ZodType<Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        delegatorAgentRunId?: string;
                        startedAt: string;
                        source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                        userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }> | Readonly<{
                        address: string;
                        teamRunId: string;
                        members: readonly Readonly<{
                            address: string;
                            agentRunId: string;
                            platformAgentRunId: string | null;
                            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                        }>[];
                        taskExecutions: readonly (Readonly<{
                            address: string;
                            agentRunId: string;
                            platformAgentRunId: string | null;
                            delegatorAgentRunId?: string;
                            startedAt: string;
                            source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                        }> | Readonly</*elided*/ any>)[];
                        delegatorAgentRunId?: string;
                        startedAt: string;
                        source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
                        userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }>, unknown, z.core.$ZodTypeInternals<Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        delegatorAgentRunId?: string;
                        startedAt: string;
                        source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                        userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }> | Readonly<{
                        address: string;
                        teamRunId: string;
                        members: readonly Readonly<{
                            address: string;
                            agentRunId: string;
                            platformAgentRunId: string | null;
                            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                        }>[];
                        taskExecutions: readonly (Readonly<{
                            address: string;
                            agentRunId: string;
                            platformAgentRunId: string | null;
                            delegatorAgentRunId?: string;
                            startedAt: string;
                            source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                            userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                        }> | Readonly</*elided*/ any>)[];
                        delegatorAgentRunId?: string;
                        startedAt: string;
                        source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
                        userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }>, unknown>>>;
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
            remote_task_executions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
            }, z.core.$strict>], "kind">>;
        }, z.core.$strict>;
    }, z.core.$strict>, z.ZodObject<{
        root_subject_kind: z.ZodLiteral<"agent">;
        root_run_id: z.ZodString;
        root_agent: z.ZodObject<{
            base_change_sequence: z.ZodNumber;
            is_active: z.ZodBoolean;
            execution_tree: z.ZodObject<{
                subjectKind: z.ZodLiteral<"agent">;
                createdAt: z.ZodString;
                host: z.ZodObject<{
                    address: z.ZodString;
                    agentRunId: z.ZodString;
                    agentDefinitionId: z.ZodString;
                }, z.core.$strict>;
                taskExecutions: z.ZodArray<z.ZodType<Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    delegatorAgentRunId?: string;
                    startedAt: string;
                    source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                    userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }> | Readonly<{
                    address: string;
                    teamRunId: string;
                    members: readonly Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }>[];
                    taskExecutions: readonly (Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        delegatorAgentRunId?: string;
                        startedAt: string;
                        source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                        userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }> | Readonly</*elided*/ any>)[];
                    delegatorAgentRunId?: string;
                    startedAt: string;
                    source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
                    userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }>, unknown, z.core.$ZodTypeInternals<Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    delegatorAgentRunId?: string;
                    startedAt: string;
                    source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                    userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }> | Readonly<{
                    address: string;
                    teamRunId: string;
                    members: readonly Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }>[];
                    taskExecutions: readonly (Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        delegatorAgentRunId?: string;
                        startedAt: string;
                        source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                        userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                    }> | Readonly</*elided*/ any>)[];
                    delegatorAgentRunId?: string;
                    startedAt: string;
                    source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
                    userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }>, unknown>>>;
            }, z.core.$strict>;
            closed_task_executions: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
                agentRunId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                teamRunId: z.ZodString;
            }, z.core.$strict>]>>;
            communication_messages: z.ZodObject<{
                schemaVersion: z.ZodLiteral<1>;
                subjectKind: z.ZodLiteral<"agent">;
                hostRunId: z.ZodString;
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
            remote_task_executions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
            }, z.core.$strict>], "kind">>;
        }, z.core.$strict>;
    }, z.core.$strict>], "root_subject_kind">;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"ROOT_EXECUTION_EVENT">;
    payload: z.ZodDiscriminatedUnion<[z.ZodObject<{
        root_subject_kind: z.ZodLiteral<"agent_team">;
        root_run_id: z.ZodString;
        change_sequence: z.ZodNumber;
        event: z.ZodUnknown;
    }, z.core.$strict>, z.ZodObject<{
        root_subject_kind: z.ZodLiteral<"agent_org">;
        root_run_id: z.ZodString;
        change_sequence: z.ZodNumber;
        change_sequence_through: z.ZodOptional<z.ZodNumber>;
        event: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
            execution: z.ZodType<Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
                source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }> | Readonly<{
                address: string;
                teamRunId: string;
                members: readonly Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }>[];
                taskExecutions: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    delegatorAgentRunId?: string;
                    startedAt: string;
                    source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                    userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }> | Readonly</*elided*/ any>)[];
                delegatorAgentRunId?: string;
                startedAt: string;
                source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
                userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }>, unknown, z.core.$ZodTypeInternals<Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
                source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }> | Readonly<{
                address: string;
                teamRunId: string;
                members: readonly Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }>[];
                taskExecutions: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    delegatorAgentRunId?: string;
                    startedAt: string;
                    source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                    userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }> | Readonly</*elided*/ any>)[];
                delegatorAgentRunId?: string;
                startedAt: string;
                source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
                userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }>, unknown>>;
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
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"remote_task_execution_started">;
            execution: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
        }, z.core.$strict>, z.ZodObject<{
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
            kind: z.ZodLiteral<"remote_task_execution_summary">;
        }, z.core.$strict>], "kind">;
    }, z.core.$strict>, z.ZodObject<{
        root_subject_kind: z.ZodLiteral<"agent">;
        root_run_id: z.ZodString;
        change_sequence: z.ZodNumber;
        change_sequence_through: z.ZodOptional<z.ZodNumber>;
        event: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
            execution: z.ZodType<Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
                source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }> | Readonly<{
                address: string;
                teamRunId: string;
                members: readonly Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }>[];
                taskExecutions: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    delegatorAgentRunId?: string;
                    startedAt: string;
                    source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                    userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }> | Readonly</*elided*/ any>)[];
                delegatorAgentRunId?: string;
                startedAt: string;
                source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
                userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }>, unknown, z.core.$ZodTypeInternals<Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
                source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }> | Readonly<{
                address: string;
                teamRunId: string;
                members: readonly Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }>[];
                taskExecutions: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    delegatorAgentRunId?: string;
                    startedAt: string;
                    source: import("./agent-org-execution-dtos.js").TaskAgentExecutionSourceDto;
                    userLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
                }> | Readonly</*elided*/ any>)[];
                delegatorAgentRunId?: string;
                startedAt: string;
                source: import("./agent-org-execution-dtos.js").TaskTeamExecutionSourceDto;
                userTeamLaunchSelection?: import("./agent-org-execution-dtos.js").UserLaunchSelectionDto;
            }>, unknown>>;
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
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"remote_task_execution_started">;
            execution: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
        }, z.core.$strict>, z.ZodObject<{
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
            kind: z.ZodLiteral<"remote_task_execution_summary">;
        }, z.core.$strict>], "kind">;
    }, z.core.$strict>], "root_subject_kind">;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"ROOT_LIFECYCLE">;
    payload: z.ZodObject<{
        root_subject_kind: z.ZodEnum<{
            agent: "agent";
            agent_team: "agent_team";
            agent_org: "agent_org";
        }>;
        root_run_id: z.ZodString;
        is_active: z.ZodBoolean;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"AGENT_COMMAND_ACK">;
    payload: z.ZodObject<{
        root_subject_kind: z.ZodEnum<{
            agent: "agent";
            agent_org: "agent_org";
        }>;
        root_run_id: z.ZodString;
        command_id: z.ZodString;
        command_type: z.ZodEnum<{
            SEND_MESSAGE: "SEND_MESSAGE";
            INTERRUPT_GENERATION: "INTERRUPT_GENERATION";
            APPROVE_TOOL: "APPROVE_TOOL";
            DENY_TOOL: "DENY_TOOL";
        }>;
        target_agent_run_id: z.ZodString;
        state: z.ZodEnum<{
            accepted: "accepted";
            rejected: "rejected";
            failed: "failed";
        }>;
        code: z.ZodNullable<z.ZodString>;
        message: z.ZodNullable<z.ZodString>;
        collaborator_name: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"ERROR">;
    payload: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>], "type">;
export declare const CollaborationStreamClientMessageSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"SEND_MESSAGE">;
    payload: z.ZodObject<{
        content: z.ZodString;
        context_file_paths: z.ZodArray<z.ZodString>;
        image_urls: z.ZodArray<z.ZodString>;
        message_id: z.ZodString;
        dedupe_key: z.ZodString;
        mentions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                agent: "agent";
                agent_team: "agent_team";
            }>;
            definition_id: z.ZodString;
        }, z.core.$strict>>>;
        root_subject_kind: z.ZodEnum<{
            agent: "agent";
            agent_org: "agent_org";
        }>;
        root_run_id: z.ZodString;
        target_agent_run_id: z.ZodString;
        command_id: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"INTERRUPT_GENERATION">;
    payload: z.ZodObject<{
        root_subject_kind: z.ZodEnum<{
            agent: "agent";
            agent_org: "agent_org";
        }>;
        root_run_id: z.ZodString;
        target_agent_run_id: z.ZodString;
        command_id: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"APPROVE_TOOL">;
    payload: z.ZodObject<{
        invocation_id: z.ZodString;
        reason: z.ZodNullable<z.ZodString>;
        root_subject_kind: z.ZodEnum<{
            agent: "agent";
            agent_org: "agent_org";
        }>;
        root_run_id: z.ZodString;
        target_agent_run_id: z.ZodString;
        command_id: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"DENY_TOOL">;
    payload: z.ZodObject<{
        invocation_id: z.ZodString;
        reason: z.ZodNullable<z.ZodString>;
        root_subject_kind: z.ZodEnum<{
            agent: "agent";
            agent_org: "agent_org";
        }>;
        root_run_id: z.ZodString;
        target_agent_run_id: z.ZodString;
        command_id: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"REFRESH_REMOTE_TASK_EXECUTIONS">;
    payload: z.ZodObject<{
        root_subject_kind: z.ZodEnum<{
            agent: "agent";
            agent_org: "agent_org";
        }>;
        root_run_id: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>], "type">;
export type AgentTeamRootExecutionViewDto = z.infer<typeof AgentTeamRootExecutionViewDtoSchema>;
export type AgentOrgRootExecutionViewDto = z.infer<typeof AgentOrgRootExecutionViewDtoSchema>;
export type AgentRootExecutionViewDto = z.infer<typeof AgentRootExecutionViewDtoSchema>;
export type RootExecutionViewDto = z.infer<typeof RootExecutionViewDtoSchema>;
export type RootExecutionEventDto = z.infer<typeof RootExecutionEventDtoSchema>;
export type CollaborationStreamServerMessage = z.infer<typeof CollaborationStreamServerMessageSchema>;
export type CollaborationStreamClientMessage = z.infer<typeof CollaborationStreamClientMessageSchema>;
//# sourceMappingURL=root-execution-view-dtos.d.ts.map