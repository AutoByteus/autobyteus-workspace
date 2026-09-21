import { z } from "zod";
export declare const AgentTeamRootExecutionViewDtoSchema: z.ZodObject<{
    root_subject_kind: z.ZodLiteral<"agent_team">;
    root_run_id: z.ZodString;
    schema_version: z.ZodLiteral<2>;
    root_team: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strict>;
export declare const AgentOrgRootExecutionViewDtoSchema: z.ZodObject<{
    root_subject_kind: z.ZodLiteral<"agent_org">;
    root_run_id: z.ZodString;
    schema_version: z.ZodLiteral<1>;
    root_org: z.ZodObject<{
        base_change_sequence: z.ZodNumber;
        is_active: z.ZodBoolean;
        execution_tree: z.ZodObject<{
            schemaVersion: z.ZodLiteral<1>;
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
                    }>;
                    llmModelIdentifier: z.ZodString;
                    llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
                    autoExecuteTools: z.ZodBoolean;
                    skillAccessMode: z.ZodString;
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
                        }>;
                        llmModelIdentifier: z.ZodString;
                        llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
                        autoExecuteTools: z.ZodBoolean;
                        skillAccessMode: z.ZodString;
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
                        }>;
                        llmModelIdentifier: z.ZodString;
                        llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
                        autoExecuteTools: z.ZodBoolean;
                        skillAccessMode: z.ZodString;
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
                            }>;
                            llmModelIdentifier: z.ZodString;
                            llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
                            autoExecuteTools: z.ZodBoolean;
                            skillAccessMode: z.ZodString;
                            workspaceRootPath: z.ZodNullable<z.ZodString>;
                        }, z.core.$strict>;
                    }, z.core.$strict>>;
                    taskExecutions: z.ZodArray<z.ZodType<Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        startedAt: string;
                        settledAt: string | null;
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
                                startedAt: string;
                                settledAt: string | null;
                            }> | Readonly</*elided*/ any>)[];
                        }>)[];
                        taskExecutions: readonly (Readonly<{
                            address: string;
                            agentRunId: string;
                            platformAgentRunId: string | null;
                            startedAt: string;
                            settledAt: string | null;
                        }> | Readonly</*elided*/ any>)[];
                        startedAt: string;
                        settledAt: string | null;
                    }>, unknown, z.core.$ZodTypeInternals<Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        startedAt: string;
                        settledAt: string | null;
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
                                startedAt: string;
                                settledAt: string | null;
                            }> | Readonly</*elided*/ any>)[];
                        }>)[];
                        taskExecutions: readonly (Readonly<{
                            address: string;
                            agentRunId: string;
                            platformAgentRunId: string | null;
                            startedAt: string;
                            settledAt: string | null;
                        }> | Readonly</*elided*/ any>)[];
                        startedAt: string;
                        settledAt: string | null;
                    }>, unknown>>>;
                }, z.core.$strict>]>>;
                taskExecutions: z.ZodArray<z.ZodType<Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    startedAt: string;
                    settledAt: string | null;
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
                            startedAt: string;
                            settledAt: string | null;
                        }> | Readonly</*elided*/ any>)[];
                    }>)[];
                    taskExecutions: readonly (Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        startedAt: string;
                        settledAt: string | null;
                    }> | Readonly</*elided*/ any>)[];
                    startedAt: string;
                    settledAt: string | null;
                }>, unknown, z.core.$ZodTypeInternals<Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    startedAt: string;
                    settledAt: string | null;
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
                            startedAt: string;
                            settledAt: string | null;
                        }> | Readonly</*elided*/ any>)[];
                    }>)[];
                    taskExecutions: readonly (Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        startedAt: string;
                        settledAt: string | null;
                    }> | Readonly</*elided*/ any>)[];
                    startedAt: string;
                    settledAt: string | null;
                }>, unknown>>>;
            }, z.core.$strict>;
        }, z.core.$strict>;
        task_records: z.ZodObject<{
            schemaVersion: z.ZodLiteral<1>;
            subjectKind: z.ZodLiteral<"agent_org">;
            orgRunId: z.ZodString;
            records: z.ZodArray<z.ZodObject<{
                taskId: z.ZodString;
                delegatorAgentRunId: z.ZodString;
                recipientAddress: z.ZodString;
                taskExecution: z.ZodUnion<readonly [z.ZodObject<{
                    agentRunId: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    teamRunId: z.ZodString;
                }, z.core.$strict>]>;
                description: z.ZodString;
                referenceFiles: z.ZodArray<z.ZodString>;
                status: z.ZodEnum<{
                    active: "active";
                    awaiting_review: "awaiting_review";
                    accepted: "accepted";
                    interrupted: "interrupted";
                }>;
                updates: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
                    submissionId: z.ZodString;
                    message: z.ZodString;
                    referenceFiles: z.ZodArray<z.ZodString>;
                    createdAt: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    reviewId: z.ZodString;
                    reviewedSubmissionId: z.ZodString;
                    decision: z.ZodEnum<{
                        accept: "accept";
                        request_revision: "request_revision";
                    }>;
                    comment: z.ZodNullable<z.ZodString>;
                    referenceFiles: z.ZodArray<z.ZodString>;
                    createdAt: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    interruptionId: z.ZodString;
                    reason: z.ZodString;
                    createdAt: z.ZodString;
                }, z.core.$strict>]>>;
                createdAt: z.ZodString;
            }, z.core.$strict>>;
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
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const RootExecutionViewDtoSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    root_subject_kind: z.ZodLiteral<"agent_team">;
    root_run_id: z.ZodString;
    schema_version: z.ZodLiteral<2>;
    root_team: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strict>, z.ZodObject<{
    root_subject_kind: z.ZodLiteral<"agent_org">;
    root_run_id: z.ZodString;
    schema_version: z.ZodLiteral<1>;
    root_org: z.ZodObject<{
        base_change_sequence: z.ZodNumber;
        is_active: z.ZodBoolean;
        execution_tree: z.ZodObject<{
            schemaVersion: z.ZodLiteral<1>;
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
                    }>;
                    llmModelIdentifier: z.ZodString;
                    llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
                    autoExecuteTools: z.ZodBoolean;
                    skillAccessMode: z.ZodString;
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
                        }>;
                        llmModelIdentifier: z.ZodString;
                        llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
                        autoExecuteTools: z.ZodBoolean;
                        skillAccessMode: z.ZodString;
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
                        }>;
                        llmModelIdentifier: z.ZodString;
                        llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
                        autoExecuteTools: z.ZodBoolean;
                        skillAccessMode: z.ZodString;
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
                            }>;
                            llmModelIdentifier: z.ZodString;
                            llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
                            autoExecuteTools: z.ZodBoolean;
                            skillAccessMode: z.ZodString;
                            workspaceRootPath: z.ZodNullable<z.ZodString>;
                        }, z.core.$strict>;
                    }, z.core.$strict>>;
                    taskExecutions: z.ZodArray<z.ZodType<Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        startedAt: string;
                        settledAt: string | null;
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
                                startedAt: string;
                                settledAt: string | null;
                            }> | Readonly</*elided*/ any>)[];
                        }>)[];
                        taskExecutions: readonly (Readonly<{
                            address: string;
                            agentRunId: string;
                            platformAgentRunId: string | null;
                            startedAt: string;
                            settledAt: string | null;
                        }> | Readonly</*elided*/ any>)[];
                        startedAt: string;
                        settledAt: string | null;
                    }>, unknown, z.core.$ZodTypeInternals<Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        startedAt: string;
                        settledAt: string | null;
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
                                startedAt: string;
                                settledAt: string | null;
                            }> | Readonly</*elided*/ any>)[];
                        }>)[];
                        taskExecutions: readonly (Readonly<{
                            address: string;
                            agentRunId: string;
                            platformAgentRunId: string | null;
                            startedAt: string;
                            settledAt: string | null;
                        }> | Readonly</*elided*/ any>)[];
                        startedAt: string;
                        settledAt: string | null;
                    }>, unknown>>>;
                }, z.core.$strict>]>>;
                taskExecutions: z.ZodArray<z.ZodType<Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    startedAt: string;
                    settledAt: string | null;
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
                            startedAt: string;
                            settledAt: string | null;
                        }> | Readonly</*elided*/ any>)[];
                    }>)[];
                    taskExecutions: readonly (Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        startedAt: string;
                        settledAt: string | null;
                    }> | Readonly</*elided*/ any>)[];
                    startedAt: string;
                    settledAt: string | null;
                }>, unknown, z.core.$ZodTypeInternals<Readonly<{
                    address: string;
                    agentRunId: string;
                    platformAgentRunId: string | null;
                    startedAt: string;
                    settledAt: string | null;
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
                            startedAt: string;
                            settledAt: string | null;
                        }> | Readonly</*elided*/ any>)[];
                    }>)[];
                    taskExecutions: readonly (Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        startedAt: string;
                        settledAt: string | null;
                    }> | Readonly</*elided*/ any>)[];
                    startedAt: string;
                    settledAt: string | null;
                }>, unknown>>>;
            }, z.core.$strict>;
        }, z.core.$strict>;
        task_records: z.ZodObject<{
            schemaVersion: z.ZodLiteral<1>;
            subjectKind: z.ZodLiteral<"agent_org">;
            orgRunId: z.ZodString;
            records: z.ZodArray<z.ZodObject<{
                taskId: z.ZodString;
                delegatorAgentRunId: z.ZodString;
                recipientAddress: z.ZodString;
                taskExecution: z.ZodUnion<readonly [z.ZodObject<{
                    agentRunId: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    teamRunId: z.ZodString;
                }, z.core.$strict>]>;
                description: z.ZodString;
                referenceFiles: z.ZodArray<z.ZodString>;
                status: z.ZodEnum<{
                    active: "active";
                    awaiting_review: "awaiting_review";
                    accepted: "accepted";
                    interrupted: "interrupted";
                }>;
                updates: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
                    submissionId: z.ZodString;
                    message: z.ZodString;
                    referenceFiles: z.ZodArray<z.ZodString>;
                    createdAt: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    reviewId: z.ZodString;
                    reviewedSubmissionId: z.ZodString;
                    decision: z.ZodEnum<{
                        accept: "accept";
                        request_revision: "request_revision";
                    }>;
                    comment: z.ZodNullable<z.ZodString>;
                    referenceFiles: z.ZodArray<z.ZodString>;
                    createdAt: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    interruptionId: z.ZodString;
                    reason: z.ZodString;
                    createdAt: z.ZodString;
                }, z.core.$strict>]>>;
                createdAt: z.ZodString;
            }, z.core.$strict>>;
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
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>], "root_subject_kind">;
export declare const RootExecutionEventDtoSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    root_subject_kind: z.ZodLiteral<"agent_team">;
    root_run_id: z.ZodString;
    change_sequence: z.ZodNumber;
    event: z.ZodUnknown;
}, z.core.$strict>, z.ZodObject<{
    root_subject_kind: z.ZodLiteral<"agent_org">;
    root_run_id: z.ZodString;
    change_sequence: z.ZodNumber;
    event: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"agent_presentation">;
        member_address: z.ZodString;
        agent_run_id: z.ZodString;
        message: z.ZodType<import("@autobyteus/agent-presentation-contracts").AgentPresentationMessage, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").AgentPresentationMessage, unknown>>;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"task">;
        event: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodLiteral<"activated">;
            task: z.ZodObject<{
                taskId: z.ZodString;
                delegatorAgentRunId: z.ZodString;
                recipientAddress: z.ZodString;
                taskExecution: z.ZodUnion<readonly [z.ZodObject<{
                    agentRunId: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    teamRunId: z.ZodString;
                }, z.core.$strict>]>;
                description: z.ZodString;
                referenceFiles: z.ZodArray<z.ZodString>;
                status: z.ZodEnum<{
                    active: "active";
                    awaiting_review: "awaiting_review";
                    accepted: "accepted";
                    interrupted: "interrupted";
                }>;
                updates: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
                    submissionId: z.ZodString;
                    message: z.ZodString;
                    referenceFiles: z.ZodArray<z.ZodString>;
                    createdAt: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    reviewId: z.ZodString;
                    reviewedSubmissionId: z.ZodString;
                    decision: z.ZodEnum<{
                        accept: "accept";
                        request_revision: "request_revision";
                    }>;
                    comment: z.ZodNullable<z.ZodString>;
                    referenceFiles: z.ZodArray<z.ZodString>;
                    createdAt: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    interruptionId: z.ZodString;
                    reason: z.ZodString;
                    createdAt: z.ZodString;
                }, z.core.$strict>]>>;
                createdAt: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"submitted">;
            task: z.ZodObject<{
                taskId: z.ZodString;
                delegatorAgentRunId: z.ZodString;
                recipientAddress: z.ZodString;
                taskExecution: z.ZodUnion<readonly [z.ZodObject<{
                    agentRunId: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    teamRunId: z.ZodString;
                }, z.core.$strict>]>;
                description: z.ZodString;
                referenceFiles: z.ZodArray<z.ZodString>;
                status: z.ZodEnum<{
                    active: "active";
                    awaiting_review: "awaiting_review";
                    accepted: "accepted";
                    interrupted: "interrupted";
                }>;
                updates: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
                    submissionId: z.ZodString;
                    message: z.ZodString;
                    referenceFiles: z.ZodArray<z.ZodString>;
                    createdAt: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    reviewId: z.ZodString;
                    reviewedSubmissionId: z.ZodString;
                    decision: z.ZodEnum<{
                        accept: "accept";
                        request_revision: "request_revision";
                    }>;
                    comment: z.ZodNullable<z.ZodString>;
                    referenceFiles: z.ZodArray<z.ZodString>;
                    createdAt: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    interruptionId: z.ZodString;
                    reason: z.ZodString;
                    createdAt: z.ZodString;
                }, z.core.$strict>]>>;
                createdAt: z.ZodString;
            }, z.core.$strict>;
            submission: z.ZodObject<{
                submissionId: z.ZodString;
                message: z.ZodString;
                referenceFiles: z.ZodArray<z.ZodString>;
                createdAt: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"reviewed">;
            task: z.ZodObject<{
                taskId: z.ZodString;
                delegatorAgentRunId: z.ZodString;
                recipientAddress: z.ZodString;
                taskExecution: z.ZodUnion<readonly [z.ZodObject<{
                    agentRunId: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    teamRunId: z.ZodString;
                }, z.core.$strict>]>;
                description: z.ZodString;
                referenceFiles: z.ZodArray<z.ZodString>;
                status: z.ZodEnum<{
                    active: "active";
                    awaiting_review: "awaiting_review";
                    accepted: "accepted";
                    interrupted: "interrupted";
                }>;
                updates: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
                    submissionId: z.ZodString;
                    message: z.ZodString;
                    referenceFiles: z.ZodArray<z.ZodString>;
                    createdAt: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    reviewId: z.ZodString;
                    reviewedSubmissionId: z.ZodString;
                    decision: z.ZodEnum<{
                        accept: "accept";
                        request_revision: "request_revision";
                    }>;
                    comment: z.ZodNullable<z.ZodString>;
                    referenceFiles: z.ZodArray<z.ZodString>;
                    createdAt: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    interruptionId: z.ZodString;
                    reason: z.ZodString;
                    createdAt: z.ZodString;
                }, z.core.$strict>]>>;
                createdAt: z.ZodString;
            }, z.core.$strict>;
            review: z.ZodObject<{
                reviewId: z.ZodString;
                reviewedSubmissionId: z.ZodString;
                decision: z.ZodEnum<{
                    accept: "accept";
                    request_revision: "request_revision";
                }>;
                comment: z.ZodNullable<z.ZodString>;
                referenceFiles: z.ZodArray<z.ZodString>;
                createdAt: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"settled">;
            task: z.ZodObject<{
                taskId: z.ZodString;
                delegatorAgentRunId: z.ZodString;
                recipientAddress: z.ZodString;
                taskExecution: z.ZodUnion<readonly [z.ZodObject<{
                    agentRunId: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    teamRunId: z.ZodString;
                }, z.core.$strict>]>;
                description: z.ZodString;
                referenceFiles: z.ZodArray<z.ZodString>;
                status: z.ZodEnum<{
                    active: "active";
                    awaiting_review: "awaiting_review";
                    accepted: "accepted";
                    interrupted: "interrupted";
                }>;
                updates: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
                    submissionId: z.ZodString;
                    message: z.ZodString;
                    referenceFiles: z.ZodArray<z.ZodString>;
                    createdAt: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    reviewId: z.ZodString;
                    reviewedSubmissionId: z.ZodString;
                    decision: z.ZodEnum<{
                        accept: "accept";
                        request_revision: "request_revision";
                    }>;
                    comment: z.ZodNullable<z.ZodString>;
                    referenceFiles: z.ZodArray<z.ZodString>;
                    createdAt: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    interruptionId: z.ZodString;
                    reason: z.ZodString;
                    createdAt: z.ZodString;
                }, z.core.$strict>]>>;
                createdAt: z.ZodString;
            }, z.core.$strict>;
            settledAt: z.ZodString;
        }, z.core.$strict>]>;
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
}, z.core.$strict>], "root_subject_kind">;
export declare const CollaborationStreamServerMessageSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"CONNECTED">;
    payload: z.ZodObject<{
        root_subject_kind: z.ZodEnum<{
            agent_org: "agent_org";
            agent_team: "agent_team";
        }>;
        root_run_id: z.ZodString;
        session_id: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"ROOT_EXECUTION_VIEW_SNAPSHOT">;
    payload: z.ZodDiscriminatedUnion<[z.ZodObject<{
        root_subject_kind: z.ZodLiteral<"agent_team">;
        root_run_id: z.ZodString;
        schema_version: z.ZodLiteral<2>;
        root_team: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strict>, z.ZodObject<{
        root_subject_kind: z.ZodLiteral<"agent_org">;
        root_run_id: z.ZodString;
        schema_version: z.ZodLiteral<1>;
        root_org: z.ZodObject<{
            base_change_sequence: z.ZodNumber;
            is_active: z.ZodBoolean;
            execution_tree: z.ZodObject<{
                schemaVersion: z.ZodLiteral<1>;
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
                        }>;
                        llmModelIdentifier: z.ZodString;
                        llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
                        autoExecuteTools: z.ZodBoolean;
                        skillAccessMode: z.ZodString;
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
                            }>;
                            llmModelIdentifier: z.ZodString;
                            llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
                            autoExecuteTools: z.ZodBoolean;
                            skillAccessMode: z.ZodString;
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
                            }>;
                            llmModelIdentifier: z.ZodString;
                            llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
                            autoExecuteTools: z.ZodBoolean;
                            skillAccessMode: z.ZodString;
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
                                }>;
                                llmModelIdentifier: z.ZodString;
                                llmConfig: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").JsonValue, unknown>>>>;
                                autoExecuteTools: z.ZodBoolean;
                                skillAccessMode: z.ZodString;
                                workspaceRootPath: z.ZodNullable<z.ZodString>;
                            }, z.core.$strict>;
                        }, z.core.$strict>>;
                        taskExecutions: z.ZodArray<z.ZodType<Readonly<{
                            address: string;
                            agentRunId: string;
                            platformAgentRunId: string | null;
                            startedAt: string;
                            settledAt: string | null;
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
                                    startedAt: string;
                                    settledAt: string | null;
                                }> | Readonly</*elided*/ any>)[];
                            }>)[];
                            taskExecutions: readonly (Readonly<{
                                address: string;
                                agentRunId: string;
                                platformAgentRunId: string | null;
                                startedAt: string;
                                settledAt: string | null;
                            }> | Readonly</*elided*/ any>)[];
                            startedAt: string;
                            settledAt: string | null;
                        }>, unknown, z.core.$ZodTypeInternals<Readonly<{
                            address: string;
                            agentRunId: string;
                            platformAgentRunId: string | null;
                            startedAt: string;
                            settledAt: string | null;
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
                                    startedAt: string;
                                    settledAt: string | null;
                                }> | Readonly</*elided*/ any>)[];
                            }>)[];
                            taskExecutions: readonly (Readonly<{
                                address: string;
                                agentRunId: string;
                                platformAgentRunId: string | null;
                                startedAt: string;
                                settledAt: string | null;
                            }> | Readonly</*elided*/ any>)[];
                            startedAt: string;
                            settledAt: string | null;
                        }>, unknown>>>;
                    }, z.core.$strict>]>>;
                    taskExecutions: z.ZodArray<z.ZodType<Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        startedAt: string;
                        settledAt: string | null;
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
                                startedAt: string;
                                settledAt: string | null;
                            }> | Readonly</*elided*/ any>)[];
                        }>)[];
                        taskExecutions: readonly (Readonly<{
                            address: string;
                            agentRunId: string;
                            platformAgentRunId: string | null;
                            startedAt: string;
                            settledAt: string | null;
                        }> | Readonly</*elided*/ any>)[];
                        startedAt: string;
                        settledAt: string | null;
                    }>, unknown, z.core.$ZodTypeInternals<Readonly<{
                        address: string;
                        agentRunId: string;
                        platformAgentRunId: string | null;
                        startedAt: string;
                        settledAt: string | null;
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
                                startedAt: string;
                                settledAt: string | null;
                            }> | Readonly</*elided*/ any>)[];
                        }>)[];
                        taskExecutions: readonly (Readonly<{
                            address: string;
                            agentRunId: string;
                            platformAgentRunId: string | null;
                            startedAt: string;
                            settledAt: string | null;
                        }> | Readonly</*elided*/ any>)[];
                        startedAt: string;
                        settledAt: string | null;
                    }>, unknown>>>;
                }, z.core.$strict>;
            }, z.core.$strict>;
            task_records: z.ZodObject<{
                schemaVersion: z.ZodLiteral<1>;
                subjectKind: z.ZodLiteral<"agent_org">;
                orgRunId: z.ZodString;
                records: z.ZodArray<z.ZodObject<{
                    taskId: z.ZodString;
                    delegatorAgentRunId: z.ZodString;
                    recipientAddress: z.ZodString;
                    taskExecution: z.ZodUnion<readonly [z.ZodObject<{
                        agentRunId: z.ZodString;
                    }, z.core.$strict>, z.ZodObject<{
                        teamRunId: z.ZodString;
                    }, z.core.$strict>]>;
                    description: z.ZodString;
                    referenceFiles: z.ZodArray<z.ZodString>;
                    status: z.ZodEnum<{
                        active: "active";
                        awaiting_review: "awaiting_review";
                        accepted: "accepted";
                        interrupted: "interrupted";
                    }>;
                    updates: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
                        submissionId: z.ZodString;
                        message: z.ZodString;
                        referenceFiles: z.ZodArray<z.ZodString>;
                        createdAt: z.ZodString;
                    }, z.core.$strict>, z.ZodObject<{
                        reviewId: z.ZodString;
                        reviewedSubmissionId: z.ZodString;
                        decision: z.ZodEnum<{
                            accept: "accept";
                            request_revision: "request_revision";
                        }>;
                        comment: z.ZodNullable<z.ZodString>;
                        referenceFiles: z.ZodArray<z.ZodString>;
                        createdAt: z.ZodString;
                    }, z.core.$strict>, z.ZodObject<{
                        interruptionId: z.ZodString;
                        reason: z.ZodString;
                        createdAt: z.ZodString;
                    }, z.core.$strict>]>>;
                    createdAt: z.ZodString;
                }, z.core.$strict>>;
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
            }, z.core.$strict>>;
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
        event: z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"agent_presentation">;
            member_address: z.ZodString;
            agent_run_id: z.ZodString;
            message: z.ZodType<import("@autobyteus/agent-presentation-contracts").AgentPresentationMessage, unknown, z.core.$ZodTypeInternals<import("@autobyteus/agent-presentation-contracts").AgentPresentationMessage, unknown>>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"task">;
            event: z.ZodUnion<readonly [z.ZodObject<{
                kind: z.ZodLiteral<"activated">;
                task: z.ZodObject<{
                    taskId: z.ZodString;
                    delegatorAgentRunId: z.ZodString;
                    recipientAddress: z.ZodString;
                    taskExecution: z.ZodUnion<readonly [z.ZodObject<{
                        agentRunId: z.ZodString;
                    }, z.core.$strict>, z.ZodObject<{
                        teamRunId: z.ZodString;
                    }, z.core.$strict>]>;
                    description: z.ZodString;
                    referenceFiles: z.ZodArray<z.ZodString>;
                    status: z.ZodEnum<{
                        active: "active";
                        awaiting_review: "awaiting_review";
                        accepted: "accepted";
                        interrupted: "interrupted";
                    }>;
                    updates: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
                        submissionId: z.ZodString;
                        message: z.ZodString;
                        referenceFiles: z.ZodArray<z.ZodString>;
                        createdAt: z.ZodString;
                    }, z.core.$strict>, z.ZodObject<{
                        reviewId: z.ZodString;
                        reviewedSubmissionId: z.ZodString;
                        decision: z.ZodEnum<{
                            accept: "accept";
                            request_revision: "request_revision";
                        }>;
                        comment: z.ZodNullable<z.ZodString>;
                        referenceFiles: z.ZodArray<z.ZodString>;
                        createdAt: z.ZodString;
                    }, z.core.$strict>, z.ZodObject<{
                        interruptionId: z.ZodString;
                        reason: z.ZodString;
                        createdAt: z.ZodString;
                    }, z.core.$strict>]>>;
                    createdAt: z.ZodString;
                }, z.core.$strict>;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"submitted">;
                task: z.ZodObject<{
                    taskId: z.ZodString;
                    delegatorAgentRunId: z.ZodString;
                    recipientAddress: z.ZodString;
                    taskExecution: z.ZodUnion<readonly [z.ZodObject<{
                        agentRunId: z.ZodString;
                    }, z.core.$strict>, z.ZodObject<{
                        teamRunId: z.ZodString;
                    }, z.core.$strict>]>;
                    description: z.ZodString;
                    referenceFiles: z.ZodArray<z.ZodString>;
                    status: z.ZodEnum<{
                        active: "active";
                        awaiting_review: "awaiting_review";
                        accepted: "accepted";
                        interrupted: "interrupted";
                    }>;
                    updates: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
                        submissionId: z.ZodString;
                        message: z.ZodString;
                        referenceFiles: z.ZodArray<z.ZodString>;
                        createdAt: z.ZodString;
                    }, z.core.$strict>, z.ZodObject<{
                        reviewId: z.ZodString;
                        reviewedSubmissionId: z.ZodString;
                        decision: z.ZodEnum<{
                            accept: "accept";
                            request_revision: "request_revision";
                        }>;
                        comment: z.ZodNullable<z.ZodString>;
                        referenceFiles: z.ZodArray<z.ZodString>;
                        createdAt: z.ZodString;
                    }, z.core.$strict>, z.ZodObject<{
                        interruptionId: z.ZodString;
                        reason: z.ZodString;
                        createdAt: z.ZodString;
                    }, z.core.$strict>]>>;
                    createdAt: z.ZodString;
                }, z.core.$strict>;
                submission: z.ZodObject<{
                    submissionId: z.ZodString;
                    message: z.ZodString;
                    referenceFiles: z.ZodArray<z.ZodString>;
                    createdAt: z.ZodString;
                }, z.core.$strict>;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"reviewed">;
                task: z.ZodObject<{
                    taskId: z.ZodString;
                    delegatorAgentRunId: z.ZodString;
                    recipientAddress: z.ZodString;
                    taskExecution: z.ZodUnion<readonly [z.ZodObject<{
                        agentRunId: z.ZodString;
                    }, z.core.$strict>, z.ZodObject<{
                        teamRunId: z.ZodString;
                    }, z.core.$strict>]>;
                    description: z.ZodString;
                    referenceFiles: z.ZodArray<z.ZodString>;
                    status: z.ZodEnum<{
                        active: "active";
                        awaiting_review: "awaiting_review";
                        accepted: "accepted";
                        interrupted: "interrupted";
                    }>;
                    updates: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
                        submissionId: z.ZodString;
                        message: z.ZodString;
                        referenceFiles: z.ZodArray<z.ZodString>;
                        createdAt: z.ZodString;
                    }, z.core.$strict>, z.ZodObject<{
                        reviewId: z.ZodString;
                        reviewedSubmissionId: z.ZodString;
                        decision: z.ZodEnum<{
                            accept: "accept";
                            request_revision: "request_revision";
                        }>;
                        comment: z.ZodNullable<z.ZodString>;
                        referenceFiles: z.ZodArray<z.ZodString>;
                        createdAt: z.ZodString;
                    }, z.core.$strict>, z.ZodObject<{
                        interruptionId: z.ZodString;
                        reason: z.ZodString;
                        createdAt: z.ZodString;
                    }, z.core.$strict>]>>;
                    createdAt: z.ZodString;
                }, z.core.$strict>;
                review: z.ZodObject<{
                    reviewId: z.ZodString;
                    reviewedSubmissionId: z.ZodString;
                    decision: z.ZodEnum<{
                        accept: "accept";
                        request_revision: "request_revision";
                    }>;
                    comment: z.ZodNullable<z.ZodString>;
                    referenceFiles: z.ZodArray<z.ZodString>;
                    createdAt: z.ZodString;
                }, z.core.$strict>;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"settled">;
                task: z.ZodObject<{
                    taskId: z.ZodString;
                    delegatorAgentRunId: z.ZodString;
                    recipientAddress: z.ZodString;
                    taskExecution: z.ZodUnion<readonly [z.ZodObject<{
                        agentRunId: z.ZodString;
                    }, z.core.$strict>, z.ZodObject<{
                        teamRunId: z.ZodString;
                    }, z.core.$strict>]>;
                    description: z.ZodString;
                    referenceFiles: z.ZodArray<z.ZodString>;
                    status: z.ZodEnum<{
                        active: "active";
                        awaiting_review: "awaiting_review";
                        accepted: "accepted";
                        interrupted: "interrupted";
                    }>;
                    updates: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
                        submissionId: z.ZodString;
                        message: z.ZodString;
                        referenceFiles: z.ZodArray<z.ZodString>;
                        createdAt: z.ZodString;
                    }, z.core.$strict>, z.ZodObject<{
                        reviewId: z.ZodString;
                        reviewedSubmissionId: z.ZodString;
                        decision: z.ZodEnum<{
                            accept: "accept";
                            request_revision: "request_revision";
                        }>;
                        comment: z.ZodNullable<z.ZodString>;
                        referenceFiles: z.ZodArray<z.ZodString>;
                        createdAt: z.ZodString;
                    }, z.core.$strict>, z.ZodObject<{
                        interruptionId: z.ZodString;
                        reason: z.ZodString;
                        createdAt: z.ZodString;
                    }, z.core.$strict>]>>;
                    createdAt: z.ZodString;
                }, z.core.$strict>;
                settledAt: z.ZodString;
            }, z.core.$strict>]>;
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
    }, z.core.$strict>], "root_subject_kind">;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"ROOT_LIFECYCLE">;
    payload: z.ZodObject<{
        root_subject_kind: z.ZodEnum<{
            agent_org: "agent_org";
            agent_team: "agent_team";
        }>;
        root_run_id: z.ZodString;
        is_active: z.ZodBoolean;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"AGENT_COMMAND_ACK">;
    payload: z.ZodObject<{
        root_subject_kind: z.ZodLiteral<"agent_org">;
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
        root_subject_kind: z.ZodLiteral<"agent_org">;
        root_run_id: z.ZodString;
        target_agent_run_id: z.ZodString;
        command_id: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"INTERRUPT_GENERATION">;
    payload: z.ZodObject<{
        root_subject_kind: z.ZodLiteral<"agent_org">;
        root_run_id: z.ZodString;
        target_agent_run_id: z.ZodString;
        command_id: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"APPROVE_TOOL">;
    payload: z.ZodObject<{
        invocation_id: z.ZodString;
        reason: z.ZodNullable<z.ZodString>;
        root_subject_kind: z.ZodLiteral<"agent_org">;
        root_run_id: z.ZodString;
        target_agent_run_id: z.ZodString;
        command_id: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"DENY_TOOL">;
    payload: z.ZodObject<{
        invocation_id: z.ZodString;
        reason: z.ZodNullable<z.ZodString>;
        root_subject_kind: z.ZodLiteral<"agent_org">;
        root_run_id: z.ZodString;
        target_agent_run_id: z.ZodString;
        command_id: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>], "type">;
export type AgentTeamRootExecutionViewDto = z.infer<typeof AgentTeamRootExecutionViewDtoSchema>;
export type AgentOrgRootExecutionViewDto = z.infer<typeof AgentOrgRootExecutionViewDtoSchema>;
export type RootExecutionViewDto = z.infer<typeof RootExecutionViewDtoSchema>;
export type RootExecutionEventDto = z.infer<typeof RootExecutionEventDtoSchema>;
export type CollaborationStreamServerMessage = z.infer<typeof CollaborationStreamServerMessageSchema>;
export type CollaborationStreamClientMessage = z.infer<typeof CollaborationStreamClientMessageSchema>;
//# sourceMappingURL=root-execution-view-dtos.d.ts.map