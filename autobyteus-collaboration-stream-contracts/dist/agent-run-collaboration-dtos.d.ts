import { z } from "zod";
/**
 * The collaboration package of one standalone Agent run (root kind `agent`): its host
 * Agent, the collaborators brought in with `@`, and their task executions.
 */
export declare const agentRunCollaborationTreeDtoSchema: z.ZodObject<{
    subjectKind: z.ZodLiteral<"agent">;
    createdAt: z.ZodString;
    host: z.ZodObject<{
        address: z.ZodString;
        agentRunId: z.ZodString;
        agentDefinitionId: z.ZodString;
    }, z.core.$strict>;
    collaborators: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"agent">;
        address: z.ZodString;
        agentDefinitionId: z.ZodString;
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
        addedAt: z.ZodString;
        addedViaAgentRunId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"agent_team">;
        address: z.ZodString;
        teamDefinitionId: z.ZodString;
        teamRunId: z.ZodString;
        coordinatorAddress: z.ZodString;
        members: z.ZodArray<z.ZodObject<{
            address: z.ZodString;
            agentDefinitionId: z.ZodString;
            agentRunId: z.ZodString;
            platformAgentRunId: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>>;
        handoffs: z.ZodArray<z.ZodObject<{
            from: z.ZodString;
            to: z.ZodString;
            rules: z.ZodArray<z.ZodString>;
        }, z.core.$strict>>;
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
        taskExecutions: z.ZodArray<z.ZodType<Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            delegatorAgentRunId?: string;
            startedAt: string;
        }> | Readonly<{
            address: string;
            teamRunId: string;
            members: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
            }> | Readonly<{
                address: string;
                teamRunId: string;
                members: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                }> | Readonly</*elided*/ any>)[];
                taskExecutions: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    delegatorAgentRunId?: string;
                    startedAt: string;
                }> | Readonly</*elided*/ any>)[];
            }>)[];
            taskExecutions: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
            }> | Readonly</*elided*/ any>)[];
            delegatorAgentRunId?: string;
            startedAt: string;
        }>, unknown, z.core.$ZodTypeInternals<Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            delegatorAgentRunId?: string;
            startedAt: string;
        }> | Readonly<{
            address: string;
            teamRunId: string;
            members: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
            }> | Readonly<{
                address: string;
                teamRunId: string;
                members: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                }> | Readonly</*elided*/ any>)[];
                taskExecutions: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    delegatorAgentRunId?: string;
                    startedAt: string;
                }> | Readonly</*elided*/ any>)[];
            }>)[];
            taskExecutions: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
            }> | Readonly</*elided*/ any>)[];
            delegatorAgentRunId?: string;
            startedAt: string;
        }>, unknown>>>;
        addedAt: z.ZodString;
        addedViaAgentRunId: z.ZodString;
    }, z.core.$strict>], "kind">>;
    taskExecutions: z.ZodArray<z.ZodType<Readonly<{
        address: string;
        agentRunId: string;
        platformAgentRunId: string | null;
        delegatorAgentRunId?: string;
        startedAt: string;
    }> | Readonly<{
        address: string;
        teamRunId: string;
        members: readonly (Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
        }> | Readonly<{
            address: string;
            teamRunId: string;
            members: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
            }> | Readonly</*elided*/ any>)[];
            taskExecutions: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
            }> | Readonly</*elided*/ any>)[];
        }>)[];
        taskExecutions: readonly (Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            delegatorAgentRunId?: string;
            startedAt: string;
        }> | Readonly</*elided*/ any>)[];
        delegatorAgentRunId?: string;
        startedAt: string;
    }>, unknown, z.core.$ZodTypeInternals<Readonly<{
        address: string;
        agentRunId: string;
        platformAgentRunId: string | null;
        delegatorAgentRunId?: string;
        startedAt: string;
    }> | Readonly<{
        address: string;
        teamRunId: string;
        members: readonly (Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
        }> | Readonly<{
            address: string;
            teamRunId: string;
            members: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
            }> | Readonly</*elided*/ any>)[];
            taskExecutions: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
            }> | Readonly</*elided*/ any>)[];
        }>)[];
        taskExecutions: readonly (Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            delegatorAgentRunId?: string;
            startedAt: string;
        }> | Readonly</*elided*/ any>)[];
        delegatorAgentRunId?: string;
        startedAt: string;
    }>, unknown>>>;
}, z.core.$strict>;
export declare const agentRunCollaborationCommunicationMessagesDtoSchema: z.ZodObject<{
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
/** Statuses cover the Agent root's children; the host reports on its own Agent stream. */
export declare const agentRunCollaborationViewDtoSchema: z.ZodObject<{
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
        collaborators: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"agent">;
            address: z.ZodString;
            agentDefinitionId: z.ZodString;
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
            addedAt: z.ZodString;
            addedViaAgentRunId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"agent_team">;
            address: z.ZodString;
            teamDefinitionId: z.ZodString;
            teamRunId: z.ZodString;
            coordinatorAddress: z.ZodString;
            members: z.ZodArray<z.ZodObject<{
                address: z.ZodString;
                agentDefinitionId: z.ZodString;
                agentRunId: z.ZodString;
                platformAgentRunId: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>;
            handoffs: z.ZodArray<z.ZodObject<{
                from: z.ZodString;
                to: z.ZodString;
                rules: z.ZodArray<z.ZodString>;
            }, z.core.$strict>>;
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
            taskExecutions: z.ZodArray<z.ZodType<Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
            }> | Readonly<{
                address: string;
                teamRunId: string;
                members: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                }> | Readonly<{
                    address: string;
                    teamRunId: string;
                    members: readonly (Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                    }> | Readonly</*elided*/ any>)[];
                    taskExecutions: readonly (Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        delegatorAgentRunId?: string;
                        startedAt: string;
                    }> | Readonly</*elided*/ any>)[];
                }>)[];
                taskExecutions: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    delegatorAgentRunId?: string;
                    startedAt: string;
                }> | Readonly</*elided*/ any>)[];
                delegatorAgentRunId?: string;
                startedAt: string;
            }>, unknown, z.core.$ZodTypeInternals<Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
            }> | Readonly<{
                address: string;
                teamRunId: string;
                members: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                }> | Readonly<{
                    address: string;
                    teamRunId: string;
                    members: readonly (Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                    }> | Readonly</*elided*/ any>)[];
                    taskExecutions: readonly (Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        delegatorAgentRunId?: string;
                        startedAt: string;
                    }> | Readonly</*elided*/ any>)[];
                }>)[];
                taskExecutions: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    delegatorAgentRunId?: string;
                    startedAt: string;
                }> | Readonly</*elided*/ any>)[];
                delegatorAgentRunId?: string;
                startedAt: string;
            }>, unknown>>>;
            addedAt: z.ZodString;
            addedViaAgentRunId: z.ZodString;
        }, z.core.$strict>], "kind">>;
        taskExecutions: z.ZodArray<z.ZodType<Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            delegatorAgentRunId?: string;
            startedAt: string;
        }> | Readonly<{
            address: string;
            teamRunId: string;
            members: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
            }> | Readonly<{
                address: string;
                teamRunId: string;
                members: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                }> | Readonly</*elided*/ any>)[];
                taskExecutions: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    delegatorAgentRunId?: string;
                    startedAt: string;
                }> | Readonly</*elided*/ any>)[];
            }>)[];
            taskExecutions: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
            }> | Readonly</*elided*/ any>)[];
            delegatorAgentRunId?: string;
            startedAt: string;
        }>, unknown, z.core.$ZodTypeInternals<Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            delegatorAgentRunId?: string;
            startedAt: string;
        }> | Readonly<{
            address: string;
            teamRunId: string;
            members: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
            }> | Readonly<{
                address: string;
                teamRunId: string;
                members: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                }> | Readonly</*elided*/ any>)[];
                taskExecutions: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    delegatorAgentRunId?: string;
                    startedAt: string;
                }> | Readonly</*elided*/ any>)[];
            }>)[];
            taskExecutions: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
            }> | Readonly</*elided*/ any>)[];
            delegatorAgentRunId?: string;
            startedAt: string;
        }>, unknown>>>;
    }, z.core.$strict>;
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
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const agentRunCollaborationEventDtoSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
    execution: z.ZodType<Readonly<{
        address: string;
        agentRunId: string;
        platformAgentRunId: string | null;
        delegatorAgentRunId?: string;
        startedAt: string;
    }> | Readonly<{
        address: string;
        teamRunId: string;
        members: readonly (Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
        }> | Readonly<{
            address: string;
            teamRunId: string;
            members: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
            }> | Readonly</*elided*/ any>)[];
            taskExecutions: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
            }> | Readonly</*elided*/ any>)[];
        }>)[];
        taskExecutions: readonly (Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            delegatorAgentRunId?: string;
            startedAt: string;
        }> | Readonly</*elided*/ any>)[];
        delegatorAgentRunId?: string;
        startedAt: string;
    }>, unknown, z.core.$ZodTypeInternals<Readonly<{
        address: string;
        agentRunId: string;
        platformAgentRunId: string | null;
        delegatorAgentRunId?: string;
        startedAt: string;
    }> | Readonly<{
        address: string;
        teamRunId: string;
        members: readonly (Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
        }> | Readonly<{
            address: string;
            teamRunId: string;
            members: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
            }> | Readonly</*elided*/ any>)[];
            taskExecutions: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
            }> | Readonly</*elided*/ any>)[];
        }>)[];
        taskExecutions: readonly (Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            delegatorAgentRunId?: string;
            startedAt: string;
        }> | Readonly</*elided*/ any>)[];
        delegatorAgentRunId?: string;
        startedAt: string;
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
    kind: z.ZodLiteral<"collaborator_added">;
    collaborator: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"agent">;
        address: z.ZodString;
        agentDefinitionId: z.ZodString;
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
        addedAt: z.ZodString;
        addedViaAgentRunId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"agent_team">;
        address: z.ZodString;
        teamDefinitionId: z.ZodString;
        teamRunId: z.ZodString;
        coordinatorAddress: z.ZodString;
        members: z.ZodArray<z.ZodObject<{
            address: z.ZodString;
            agentDefinitionId: z.ZodString;
            agentRunId: z.ZodString;
            platformAgentRunId: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>>;
        handoffs: z.ZodArray<z.ZodObject<{
            from: z.ZodString;
            to: z.ZodString;
            rules: z.ZodArray<z.ZodString>;
        }, z.core.$strict>>;
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
        taskExecutions: z.ZodArray<z.ZodType<Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            delegatorAgentRunId?: string;
            startedAt: string;
        }> | Readonly<{
            address: string;
            teamRunId: string;
            members: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
            }> | Readonly<{
                address: string;
                teamRunId: string;
                members: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                }> | Readonly</*elided*/ any>)[];
                taskExecutions: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    delegatorAgentRunId?: string;
                    startedAt: string;
                }> | Readonly</*elided*/ any>)[];
            }>)[];
            taskExecutions: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
            }> | Readonly</*elided*/ any>)[];
            delegatorAgentRunId?: string;
            startedAt: string;
        }>, unknown, z.core.$ZodTypeInternals<Readonly<{
            address: string;
            agentRunId: string;
            platformAgentRunId: string | null;
            delegatorAgentRunId?: string;
            startedAt: string;
        }> | Readonly<{
            address: string;
            teamRunId: string;
            members: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
            }> | Readonly<{
                address: string;
                teamRunId: string;
                members: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                }> | Readonly</*elided*/ any>)[];
                taskExecutions: readonly (Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    delegatorAgentRunId?: string;
                    startedAt: string;
                }> | Readonly</*elided*/ any>)[];
            }>)[];
            taskExecutions: readonly (Readonly<{
                address: string;
                agentRunId: string;
                platformAgentRunId: string | null;
                delegatorAgentRunId?: string;
                startedAt: string;
            }> | Readonly</*elided*/ any>)[];
            delegatorAgentRunId?: string;
            startedAt: string;
        }>, unknown>>>;
        addedAt: z.ZodString;
        addedViaAgentRunId: z.ZodString;
    }, z.core.$strict>], "kind">;
}, z.core.$strict>], "kind">;
export type AgentRunCollaborationTreeDto = Readonly<z.infer<typeof agentRunCollaborationTreeDtoSchema>>;
export type AgentRunCollaborationViewDto = Readonly<z.infer<typeof agentRunCollaborationViewDtoSchema>>;
export type AgentRunCollaborationEventDto = Readonly<z.infer<typeof agentRunCollaborationEventDtoSchema>>;
//# sourceMappingURL=agent-run-collaboration-dtos.d.ts.map